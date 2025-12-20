"use client";

interface LoadingSpinnerProps {
    /** 전체 화면 로딩인 경우 true */
    fullScreen?: boolean;
    /** 추가 클래스명 */
    className?: string;
}

/**
 * 공통 로딩 스피너 컴포넌트
 * 앱 전체에서 동일한 스타일의 로딩 화면을 사용합니다.
 */
export function LoadingSpinner({ fullScreen = false, className = "" }: LoadingSpinnerProps) {
    if (fullScreen) {
        return (
            <div className={`flex items-center justify-center h-full pt-16 bg-black ${className}`}>
                <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className={`flex items-center justify-center h-40 ${className}`}>
            <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );
}
