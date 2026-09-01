type TableQrDisplayProps = {
  url: string;
  size?: number;
  className?: string;
  alt?: string;
};

export function qrImageSrc(url: string, size = 160, download = false, filename?: string) {
  const params = new URLSearchParams({
    data: url,
    size: String(size),
  });
  if (download) {
    params.set("download", "1");
    if (filename) params.set("filename", filename);
  }
  return `/api/qr?${params.toString()}`;
}

export function TableQrDisplay({
  url,
  size = 160,
  className = "",
  alt = "Table QR code",
}: TableQrDisplayProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- dynamic QR PNG from API
    <img
      src={qrImageSrc(url, size)}
      width={size}
      height={size}
      alt={alt}
      className={className}
    />
  );
}

export function downloadQrPng(url: string, size: number, filename: string) {
  const link = document.createElement("a");
  link.href = qrImageSrc(url, size, true, filename);
  link.download = filename;
  link.click();
}
