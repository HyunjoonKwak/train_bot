#!/bin/bash
set -e

# ============================================================
# TrainBot — Local Docker Management + GHCR Push
# ============================================================

APP_NAME="trainbot"
COMPOSE_FILE="docker/docker-compose.yml"
GHCR_USERNAME="${GHCR_USERNAME:-hyunjoonkwak}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ---- Local Docker operations ----

start() {
    log_info "Starting ${APP_NAME}..."
    docker compose -f "$COMPOSE_FILE" up -d
    log_info "Started. http://localhost:3100"
}

stop() {
    log_info "Stopping ${APP_NAME}..."
    docker compose -f "$COMPOSE_FILE" down
    log_info "Stopped."
}

restart() {
    log_info "Restarting ${APP_NAME}..."
    docker compose -f "$COMPOSE_FILE" restart
    log_info "Restarted."
}

rebuild() {
    local NO_CACHE=""
    if [ "$1" = "no-cache" ]; then
        NO_CACHE="--no-cache"
        log_info "Rebuilding ${APP_NAME} (no cache)..."
    else
        log_info "Rebuilding ${APP_NAME}..."
    fi
    docker compose -f "$COMPOSE_FILE" down
    docker compose -f "$COMPOSE_FILE" build $NO_CACHE
    docker compose -f "$COMPOSE_FILE" up -d
    log_info "Rebuild complete. http://localhost:3100"
}

logs() {
    local LINES="${1:-100}"
    docker compose -f "$COMPOSE_FILE" logs -f --tail "$LINES"
}

status() {
    echo "=== Containers ==="
    docker compose -f "$COMPOSE_FILE" ps
    echo ""
    echo "=== Images ==="
    docker images | grep "$APP_NAME" || echo "No local images found"
}

shell() {
    log_info "Entering ${APP_NAME} container..."
    docker compose -f "$COMPOSE_FILE" exec "$APP_NAME" sh
}

update() {
    log_info "Pulling latest code and rebuilding..."
    git pull
    rebuild "$1"
}

clean() {
    log_warn "Removing containers, volumes, and local images..."
    docker compose -f "$COMPOSE_FILE" down -v --rmi local
    log_info "Cleaned."
}

# ---- GHCR operations ----

ghcr_login() {
    log_info "Logging in to GHCR as ${GHCR_USERNAME}..."
    echo "Enter GitHub Personal Access Token (with write:packages scope):"
    read -s GITHUB_TOKEN
    if echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin; then
        log_info "GHCR login successful."
    else
        log_error "GHCR login failed."
        exit 1
    fi
}

ghcr_push() {
    local IMAGE_TAG="${1:-latest}"
    local FULL_IMAGE="ghcr.io/${GHCR_USERNAME}/${APP_NAME}:${IMAGE_TAG}"

    log_info "Building and pushing multi-platform image..."
    log_info "Image: ${FULL_IMAGE}"

    # Ensure buildx builder exists
    if ! docker buildx inspect multiplatform > /dev/null 2>&1; then
        log_info "Creating buildx builder..."
        docker buildx create --name multiplatform --use
    else
        docker buildx use multiplatform
    fi

    docker buildx build \
        --platform linux/amd64,linux/arm64 \
        -f docker/Dockerfile \
        -t "$FULL_IMAGE" \
        --push \
        .

    log_info "Push complete: ${FULL_IMAGE}"
}

ghcr_status() {
    echo "=== Local GHCR Images ==="
    docker images | grep "ghcr.io/${GHCR_USERNAME}/${APP_NAME}" || echo "No local GHCR images"
}

# ---- Main ----

case "${1}" in
    start)      start ;;
    stop)       stop ;;
    restart)    restart ;;
    rebuild)    rebuild "$2" ;;
    logs)       logs "$2" ;;
    status)     status ;;
    shell)      shell ;;
    update)     update "$2" ;;
    clean)      clean ;;
    ghcr:login)  ghcr_login ;;
    ghcr:push)   ghcr_push "$2" ;;
    ghcr:status) ghcr_status ;;
    *)
        echo "Usage: $0 {command}"
        echo ""
        echo "Local Docker:"
        echo "  start              Start containers"
        echo "  stop               Stop containers"
        echo "  restart            Restart containers"
        echo "  rebuild [no-cache] Rebuild and start"
        echo "  logs [lines]       Tail container logs"
        echo "  status             Show container/image status"
        echo "  shell              Enter container shell"
        echo "  update [no-cache]  Git pull + rebuild"
        echo "  clean              Remove containers, volumes, images"
        echo ""
        echo "GHCR Registry:"
        echo "  ghcr:login         Login to GitHub Container Registry"
        echo "  ghcr:push [tag]    Build multi-platform + push (default: latest)"
        echo "  ghcr:status        Show local GHCR images"
        exit 1
        ;;
esac
