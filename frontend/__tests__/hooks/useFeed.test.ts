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
import { renderHook } from '@testing-library/react-native';
import { useFeed } from '@/hooks/useFeed';
import useNewsFeed from '@/hooks/useNewsFeed';
import useEventsFeed from '@/hooks/useEventsFeed';

jest.mock('@/hooks/useNewsFeed');
jest.mock('@/hooks/useEventsFeed');

const mockUseNewsFeed = useNewsFeed as jest.MockedFunction<typeof useNewsFeed>;
const mockUseEventsFeed = useEventsFeed as jest.MockedFunction<typeof useEventsFeed>;

describe('useFeed Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should combine news and events items', () => {
    const mockNewsItems = [
      { title: 'News 1', link: 'http://example.com/1', pubDate: '2025-01-01', description: 'Description 1' },
    ];
    const mockEventItems = [
      { id: '1', type: 'event', title: 'Event 1', date: '2025-01-15', teaser: 'Teaser', url: 'http://example.com/event1', location: 'Location 1', imageUrl: '', resourceUrl: '' },
    ];

    mockUseNewsFeed.mockReturnValue({ newsItems: mockNewsItems as any, loading: false });
    mockUseEventsFeed.mockReturnValue({ eventItems: mockEventItems as any, loading: false });

    const { result } = renderHook(() => useFeed());

    expect(result.current.newsItems).toEqual(mockNewsItems);
    expect(result.current.eventItems).toEqual(mockEventItems);
    expect(result.current.isEmpty).toBe(false);
  });

  it('should detect empty state', () => {
    mockUseNewsFeed.mockReturnValue({ newsItems: [], loading: false });
    mockUseEventsFeed.mockReturnValue({ eventItems: [], loading: false });

    const { result } = renderHook(() => useFeed());

    expect(result.current.isEmpty).toBe(true);
  });
});
