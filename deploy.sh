#!/bin/bash
set -e

# ============================================================
# TrainBot — NAS Production Deployment (GHCR)
# ============================================================
# 사용법:
#   NAS에 이 파일들을 복사:
#     deploy.sh
#     docker/docker-compose.prod.yml
#     .env
#
#   ./deploy.sh update          # pull + deploy
#   ./deploy.sh update v1.2.0   # 특정 태그 배포
# ============================================================

APP_NAME="trainbot"
COMPOSE_FILE="docker/docker-compose.prod.yml"
GHCR_USERNAME="${GHCR_USERNAME:-hyunjoonkwak}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Load .env if exists
if [ -f .env ]; then
    set -a; source .env; set +a
fi

pull_images() {
    local TAG="${1:-latest}"
    export IMAGE_TAG="$TAG"
    log_info "Pulling image: ghcr.io/${GHCR_USERNAME}/${APP_NAME}:${TAG}"
    docker compose -f "$COMPOSE_FILE" pull
}

deploy() {
    log_info "Deploying ${APP_NAME}..."
    docker compose -f "$COMPOSE_FILE" up -d
    log_info "Deployed. Waiting for health check..."
    sleep 5
    status
}

update() {
    local TAG="${1:-latest}"
    export IMAGE_TAG="$TAG"
    log_info "Updating ${APP_NAME} (tag: ${TAG})..."
    stop 2>/dev/null || true
    pull_images "$TAG"
    deploy
}

start() {
    log_info "Starting ${APP_NAME}..."
    docker compose -f "$COMPOSE_FILE" up -d
}

stop() {
    log_info "Stopping ${APP_NAME}..."
    docker compose -f "$COMPOSE_FILE" down
}

restart() {
    log_info "Restarting ${APP_NAME}..."
    docker compose -f "$COMPOSE_FILE" restart
}

status() {
    echo "=== Containers ==="
    docker compose -f "$COMPOSE_FILE" ps
    echo ""
    echo "=== Images ==="
    docker images | grep "$APP_NAME" || echo "No images found"
}

logs() {
    local SERVICE="${1:-}"
    if [ -n "$SERVICE" ]; then
        docker compose -f "$COMPOSE_FILE" logs -f --tail 100 "$SERVICE"
    else
        docker compose -f "$COMPOSE_FILE" logs -f --tail 100
    fi
}

cleanup() {
    log_warn "Pruning unused Docker resources..."
    docker system prune -f
    docker image prune -f
    log_info "Cleanup complete."
}

# ---- Main ----

case "${1}" in
    update)   update "$2" ;;
    start)    start ;;
    stop)     stop ;;
    restart)  restart ;;
    status)   status ;;
    logs)     logs "$2" ;;
    cleanup)  cleanup ;;
    *)
        echo "Usage: $0 {command}"
        echo ""
        echo "  update [tag]    Pull image + deploy (default: latest)"
        echo "  start           Start containers"
        echo "  stop            Stop containers"
        echo "  restart         Restart containers"
        echo "  status          Show container/image status"
        echo "  logs [service]  Tail logs"
        echo "  cleanup         Prune unused Docker resources"
        exit 1
        ;;
esac
