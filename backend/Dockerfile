FROM golang:1.23-alpine AS base

# 開発に必要なツールをインストール
RUN apk add --no-cache git ca-certificates

WORKDIR /app

# go.modとgo.sumをコピーしてdependenciesをインストール
COPY go.mod go.sum ./
RUN go mod download

# 開発用ステージ
FROM base AS development
# airをインストール（ホットリロード用）
RUN go install github.com/cosmtrek/air@v1.49.0
# 開発時用の設定ファイルをコピー
COPY . .
EXPOSE 8080
CMD ["air"]

# プロダクション用ステージ
FROM base AS production
# ソースコードをコピー
COPY . .
# アプリケーションをビルド
RUN CGO_ENABLED=0 GOOS=linux go build -o main ./cmd/server

# 実行用の軽量イメージ
FROM alpine:latest AS runtime
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=production /app/main .
COPY --from=production /app/configs ./configs
EXPOSE 8080
CMD ["/app/main"]

# デフォルトは開発用
FROM development