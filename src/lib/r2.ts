import { S3Client } from "@aws-sdk/client-s3";

// R2는 S3 호환 API를 제공
// 환경변수:
// - R2_ACCOUNT_ID: Cloudflare 계정 ID
// - R2_ACCESS_KEY_ID: R2 API 토큰의 Access Key ID
// - R2_SECRET_ACCESS_KEY: R2 API 토큰의 Secret Access Key
// - R2_BUCKET_NAME: R2 버킷 이름
// - R2_PUBLIC_URL: 퍼블릭 URL (선택, 커스텀 도메인이 있는 경우)

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

if (!accountId || !accessKeyId || !secretAccessKey) {
    console.warn("R2 환경변수가 설정되지 않았습니다. 이미지 업로드가 비활성화됩니다.");
}

export const r2Client = new S3Client({
    region: "auto", // R2는 리전 불필요
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: accessKeyId || "",
        secretAccessKey: secretAccessKey || "",
    },
});

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "counsel-images";

// 퍼블릭 URL 생성 헬퍼
export function getPublicUrl(key: string): string {
    // 커스텀 도메인이 있으면 사용, 없으면 R2 기본 URL
    const publicUrl = process.env.R2_PUBLIC_URL;
    if (publicUrl) {
        return `${publicUrl}/${key}`;
    }
    // R2 퍼블릭 액세스가 활성화된 경우 기본 URL
    return `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${key}`;
}

export const isR2Configured = !!(accountId && accessKeyId && secretAccessKey);
