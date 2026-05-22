// Copyright (c) 2025 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.
package rbac

import (
	"strings"
)

// GroupSet is an optimized representation for membership checks.
// All entries are normalized (trimmed, lowercased).
type GroupSet map[string]struct{}

func normalizeGroup(g string) string {
	g = strings.TrimSpace(g)
	g = strings.ToLower(g)
	return g
}

// makeGroupSet builds a normalized GroupSet, skipping empties.
func makeGroupSet(groups []string) GroupSet {
	set := make(GroupSet, len(groups))
	for _, g := range groups {
		ng := normalizeGroup(g)
		if ng == "" {
			continue
		}
		set[ng] = struct{}{}
	}
	return set
}

// HasGroup checks if user belongs to a specific group.
func HasGroup(userGroups []string, group string) bool {
	set := makeGroupSet(userGroups)
	_, ok := set[normalizeGroup(group)]
	return ok
}

// HasAnyGroup checks if user belongs to any of the groups.
func HasAnyGroup(userGroups []string, groups ...string) bool {
	set := makeGroupSet(userGroups)
	return HasAnyGroupSet(set, groups...)
}

// HasAnyGroupSet checks membership using an existing set (avoids allocations).
func HasAnyGroupSet(userSet GroupSet, groups ...string) bool {
	for _, g := range groups {
		if _, ok := userSet[normalizeGroup(g)]; ok {
			return true
		}
	}
	return false
}
