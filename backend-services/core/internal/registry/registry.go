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
package registry

import (
	"fmt"
	"sync"
)

// Factory defines a function that creates a service instance T.
// It accepts a configuration map.
type Factory[T any] func(config map[string]any) (T, error)

// Registry is a thread-safe registry for services of type T.
type Registry[T any] struct {
	mu        sync.RWMutex
	factories map[string]Factory[T]
}

// New creates a new Registry for type T.
func New[T any]() *Registry[T] {
	return &Registry[T]{
		factories: make(map[string]Factory[T]),
	}
}

// Register adds a factory with the given name.
// It panics if a factory with the same name is already registered.
func (r *Registry[T]) Register(name string, factory Factory[T]) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.factories[name]; exists {
		panic(fmt.Sprintf("registry: service %q already registered", name))
	}
	r.factories[name] = factory
}

// Get creates a new instance of the service using the registered factory.
func (r *Registry[T]) Get(name string, config map[string]any) (T, error) {
	r.mu.RLock()
	factory, exists := r.factories[name]
	r.mu.RUnlock()

	if !exists {
		var zero T
		return zero, fmt.Errorf("registry: service %q not found", name)
	}

	return factory(config)
}

// List returns a list of registered service names.
func (r *Registry[T]) List() []string {
	r.mu.RLock()
	defer r.mu.RUnlock()
	keys := make([]string, 0, len(r.factories))
	for k := range r.factories {
		keys = append(keys, k)
	}
	return keys
}
