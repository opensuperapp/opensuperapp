# Copyright (c) 2025 WSO2 LLC. (https://www.wso2.com).

# WSO2 LLC. licenses this file to you under the Apache License,
# Version 2.0 (the "License"); you may not use this file except
# in compliance with the License.
# You may obtain a copy of the License at
#
# http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.

#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
KEY_ID=${1:-"superapp-key-$(date +%s)"}
OUTPUT_DIR=${2:-"../keys"}
KEY_SIZE=${3:-2048}

echo -e "${GREEN}🔑 RSA Key Pair Generator${NC}"
echo "================================"
echo "Key ID:      $KEY_ID"
echo "Output Dir:  $OUTPUT_DIR"
echo "Key Size:    $KEY_SIZE bits"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# File paths
PRIVATE_KEY="$OUTPUT_DIR/${KEY_ID}_private.pem"
PUBLIC_KEY="$OUTPUT_DIR/${KEY_ID}_public.pem"
JWKS_FILE="$OUTPUT_DIR/${KEY_ID}_jwks.json"

# Check if keys already exist
if [ -f "$PRIVATE_KEY" ]; then
    echo -e "${YELLOW}⚠️  Warning: Keys with this ID already exist!${NC}"
    read -p "Overwrite? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
fi

# Generate private key
echo -e "${GREEN}📝 Generating private key...${NC}"
openssl genrsa -out "$PRIVATE_KEY" "$KEY_SIZE" 2>/dev/null

# Extract public key
echo -e "${GREEN}📝 Extracting public key...${NC}"
openssl rsa -in "$PRIVATE_KEY" -pubout -out "$PUBLIC_KEY" 2>/dev/null

# Generate JWKS
echo -e "${GREEN}📝 Generating JWKS...${NC}"
go run "$(dirname "$0")/generate-jwks.go" "$PUBLIC_KEY" "$KEY_ID" > "$JWKS_FILE"

# Set permissions (private key should be read-only by owner)
chmod 600 "$PRIVATE_KEY"
chmod 644 "$PUBLIC_KEY"
chmod 644 "$JWKS_FILE"

echo ""
echo -e "${GREEN}✅ Keys generated successfully!${NC}"
echo ""
echo "Files created:"
echo "  🔒 Private Key: $PRIVATE_KEY"
echo "  🔓 Public Key:  $PUBLIC_KEY"
echo "  📋 JWKS:        $JWKS_FILE"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT SECURITY NOTES:${NC}"
echo "  1. Never commit private keys to version control"
echo "  2. Store private keys securely (Vault, Secrets Manager, etc.)"
echo "  3. Rotate keys regularly (every 90 days for production)"
echo "  4. Use different keys for dev/staging/production"
echo ""
echo "Next steps:"
echo "  1. Update .env file:"
echo "     PRIVATE_KEY_PATH=$PRIVATE_KEY"
echo "     PUBLIC_KEY_PATH=$PUBLIC_KEY"
echo "     JWKS_PATH=$JWKS_FILE"
echo "     ACTIVE_KEY_ID=$KEY_ID"
echo ""
echo "  2. Restart token-issure-service"
echo ""
