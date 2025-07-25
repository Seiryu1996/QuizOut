FROM golang:1.21-alpine AS builder

WORKDIR /app

# ソースコードをコピー
COPY . .

# Go modulesを更新
RUN go mod tidy
RUN go mod download

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