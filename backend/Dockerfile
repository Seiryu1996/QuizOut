FROM golang:1.21-alpine AS builder

WORKDIR /app

# Go modulesファイルをコピー
COPY go.mod go.sum ./
RUN go mod download

# ソースコードをコピー
COPY . .

# アプリケーションをビルド
RUN CGO_ENABLED=0 GOOS=linux go build -o main ./cmd/server

# 実行用の軽量イメージ
FROM alpine:latest

# セキュリティアップデートとca-certificatesをインストール
RUN apk --no-cache add ca-certificates

WORKDIR /root/

# バイナリをコピー
COPY --from=builder /app/main .

# ポートを公開
EXPOSE 8080

# アプリケーションを実行
CMD ["./main"]