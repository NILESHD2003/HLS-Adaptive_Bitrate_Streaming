#!/bin/bash

set -e

if [ "$#" -ne 3 ]; then
    echo "ERROR: Invalid parameters" >&2
    exit 1
fi

SOURCE_URL="$1"
PRESIGNED_URL="$2"
VIDEO_ID="$3"

WORK_DIR="/tmp/${VIDEO_ID}"
mkdir -p "${WORK_DIR}"
mkdir -p "${WORK_DIR}/480p" "${WORK_DIR}/720p" "${WORK_DIR}/1080p"

wget -q -O "${WORK_DIR}/source.mp4" "${SOURCE_URL}" 2>/dev/null || {
    echo "ERROR: Failed to download source video" >&2
    exit 1
}

cat > "${WORK_DIR}/master.m3u8" << EOF
#EXTM3U
#EXT-X-VERSION:3
EOF

process_quality() {
    local resolution="$1"
    local scale="$2"
    local bandwidth="$3"
    local quality_dir="${WORK_DIR}/${resolution}"

    ffmpeg -i "${WORK_DIR}/source.mp4" \
        -vf "scale=${scale}" \
        -c:v h264 \
        -c:a aac \
        -b:a 128k \
        -hls_time 10 \
        -hls_list_size 0 \
        -hls_segment_filename "${quality_dir}/video${resolution%p}_%03d.ts" \
        "${quality_dir}/index.m3u8" \
        -loglevel error 2>/dev/null || {
        echo "ERROR: Transcoding failed for ${resolution}" >&2
        exit 1
    }

    echo "#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${scale/:/x}" >> "${WORK_DIR}/master.m3u8"
    echo "${resolution}/index.m3u8" >> "${WORK_DIR}/master.m3u8"
}

process_quality "480p" "854:480" "800000" 2>/dev/null &
process_quality "720p" "1280:720" "1400000" 2>/dev/null &
process_quality "1080p" "1920:1080" "2800000" 2>/dev/null &

wait

BASE_URL=$(echo "$PRESIGNED_URL" | cut -d'?' -f1)
QUERY_PARAMS=$(echo "$PRESIGNED_URL" | grep -o '?.*' || echo '')
BASE_URL="${BASE_URL%/}/${VIDEO_ID}"

upload_file() {
    local file="$1"
    local relative_path="${file#${WORK_DIR}/}"
    local upload_url="${BASE_URL}/${relative_path}${QUERY_PARAMS}"

    curl -s -X PUT -T "$file" "$upload_url" > /dev/null 2>&1 || {
        echo "ERROR: Failed to upload ${relative_path}" >&2
        exit 1
    }
}

upload_file "${WORK_DIR}/master.m3u8"

for quality in 480p 720p 1080p; do
    upload_file "${WORK_DIR}/${quality}/index.m3u8"
    for segment in "${WORK_DIR}/${quality}"/*.ts; do
        upload_file "$segment"
    done
done

rm -rf "${WORK_DIR}"

echo "SUCCESS"