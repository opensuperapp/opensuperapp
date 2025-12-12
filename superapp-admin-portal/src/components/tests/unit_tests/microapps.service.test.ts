// Unit tests for microAppsService. We mock apiService to avoid Vite-specific code.

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

jest.mock('../../../services/api.service', () => {
	return {
		apiService: {
	get: jest.fn(),
	post: jest.fn(),
	put: jest.fn(),
	delete: jest.fn(),
		},
	};
});

import { microAppsService } from '../../../services/microapps.service';
import { apiService } from '../../../services/api.service';
import type { MicroApp } from '../../../types/microapp.types';

const mockedApi = apiService as unknown as {
	get: jest.Mock;
	post: jest.Mock;
	put: jest.Mock;
	delete: jest.Mock;
};

describe('microAppsService', () => {
	beforeEach(() => {
		mockedApi.get.mockReset();
		mockedApi.post.mockReset();
		mockedApi.put.mockReset();
		mockedApi.delete.mockReset();
	});

	it('getAll should call GET /micro-apps and return list', async () => {
		const apps: MicroApp[] = [
			{
				appId: 'app-1',
				name: 'App One',
				description: 'Desc',
				promoText: 'Promo',
				iconUrl: '/icon.png',
				bannerImageUrl: '/banner.png',
				isMandatory: 0,
				versions: [],
				roles: [],
			},
		];
		mockedApi.get.mockResolvedValueOnce(apps);

		const result = await microAppsService.getAll();

		expect(mockedApi.get).toHaveBeenCalledTimes(1);
		expect(mockedApi.get).toHaveBeenCalledWith('/micro-apps');
		expect(result).toEqual(apps);
	});

	it('getById should call GET /micro-apps/:id', async () => {
		const app: MicroApp = {
			appId: 'abc',
			name: 'App',
			description: 'Desc',
			promoText: 'Promo',
			iconUrl: '/icon.png',
			bannerImageUrl: '/banner.png',
			isMandatory: 0,
			versions: [],
			roles: [],
		};
		mockedApi.get.mockResolvedValueOnce(app);

		const result = await microAppsService.getById('abc');

		expect(mockedApi.get).toHaveBeenCalledWith('/micro-apps/abc');
		expect(result).toEqual(app);
	});

	it('upsert should POST /micro-apps with payload', async () => {
		const app: MicroApp = {
			appId: 'new',
			name: 'New',
			description: 'Desc',
			promoText: 'Promo',
			iconUrl: '/icon.png',
			bannerImageUrl: '/banner.png',
			isMandatory: 1,
			versions: [],
			roles: [],
		};
		mockedApi.post.mockResolvedValueOnce(undefined);

		await microAppsService.upsert(app);

		expect(mockedApi.post).toHaveBeenCalledWith('/micro-apps', app);
	});

	it('addVersion should POST /micro-apps/:id/versions with version payload', async () => {
		const version = {
			version: '1.0.0',
			build: 1,
			releaseNotes: 'Initial',
			iconUrl: '/icon.png',
			downloadUrl: '/file.apk',
		};
		mockedApi.post.mockResolvedValueOnce(undefined);

		await microAppsService.addVersion('abc', version);

		expect(mockedApi.post).toHaveBeenCalledWith('/micro-apps/abc/versions', version);
	});

	it('delete should PUT /micro-apps/deactivate/:id', async () => {
		mockedApi.put.mockResolvedValueOnce(undefined);

		await microAppsService.delete('abc');

		expect(mockedApi.put).toHaveBeenCalledWith('/micro-apps/deactivate/abc');
	});
});

