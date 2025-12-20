import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client, R2_BUCKET_NAME, getPublicUrl, isR2Configured } from "@/lib/r2";

// Route Segment Config (App Router)
export const runtime = "nodejs";
export const maxDuration = 30; // 30초 타임아웃

// Presigned URL 생성 (GET) 또는 직접 업로드 (POST)
export async function POST(request: NextRequest) {
    if (!isR2Configured) {
        return NextResponse.json(
            { error: "R2가 설정되지 않았습니다." },
            { status: 500 }
        );
    }

    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const mode = formData.get("mode") as string | null;

        // presigned URL 요청 모드
        if (mode === "presigned") {
            const filename = formData.get("filename") as string;
            const contentType = formData.get("contentType") as string;

            if (!filename || !contentType) {
                return NextResponse.json(
                    { error: "filename과 contentType이 필요합니다." },
                    { status: 400 }
                );
            }

            // 유니크 키 생성
            const key = `characters/${Date.now()}-${Math.random().toString(36).slice(2)}-${filename}`;

            const command = new PutObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: key,
                ContentType: contentType,
            });

            const presignedUrl = await getSignedUrl(r2Client, command, {
                expiresIn: 3600, // 1시간 유효
            });

            return NextResponse.json({
                presignedUrl,
                key,
                publicUrl: getPublicUrl(key),
            });
        }

        // 직접 업로드 모드
        if (!file) {
            return NextResponse.json(
                { error: "파일이 필요합니다." },
                { status: 400 }
            );
        }

        // 파일 크기 제한 (5MB)
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json(
                { error: "파일 크기는 5MB 이하여야 합니다." },
                { status: 400 }
            );
        }

        // 이미지 타입 확인
        if (!file.type.startsWith("image/")) {
            return NextResponse.json(
                { error: "이미지 파일만 업로드 가능합니다." },
                { status: 400 }
            );
        }

        // 유니크 키 생성
        const ext = file.name.split(".").pop() || "jpg";
        const key = `characters/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        // 파일 업로드
        const arrayBuffer = await file.arrayBuffer();
        const command = new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            Body: Buffer.from(arrayBuffer),
            ContentType: file.type,
        });

        await r2Client.send(command);

        return NextResponse.json({
            key,
            publicUrl: getPublicUrl(key),
        });
    } catch (error) {
        console.error("업로드 실패:", error);
        return NextResponse.json(
            { error: "업로드에 실패했습니다." },
            { status: 500 }
        );
    }
}
