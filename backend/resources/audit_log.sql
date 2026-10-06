-- Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
--
-- WSO2 LLC. licenses this file to you under the Apache License,
-- Version 2.0 (the "License"); you may not use this file except
-- in compliance with the License.
-- You may obtain a copy of the License at
--
-- http://www.apache.org/licenses/LICENSE-2.0
--
-- Unless required by applicable law or agreed to in writing,
-- software distributed under the License is distributed on an
-- "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
-- KIND, either express or implied.  See the License for the
-- specific language governing permissions and limitations
-- under the License.

-- Append-only record of user actions worth keeping a trail of, shared by every superapp
-- feature rather than one table per feature. Rows are written server-side only.
CREATE TABLE audit_log (
    id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    -- Feature the action belongs to, e.g. business_card
    category     VARCHAR(64)  NOT NULL,
    -- What happened within that feature, e.g. apple_wallet_pass_issued
    action       VARCHAR(64)  NOT NULL,
    actor_id     VARCHAR(64)  NOT NULL,
    actor_email  VARCHAR(255) NULL,
    -- Human readable sentence, so a row reads on its own without decoding the action key
    description  VARCHAR(512) NULL,
    -- Extra context for the action. Keep it small and free of PII
    metadata     JSON         NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_audit_log_actor (actor_id),
    INDEX idx_audit_log_category_created (category, created_at)
);
