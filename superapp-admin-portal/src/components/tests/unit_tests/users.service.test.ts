import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock the shared apiService used by users.service
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

import { usersService, type User } from '../../../services/users.service';
import { apiService } from '../../../services/api.service';

// Loosen the types for mocks to keep tests simple
const mockedApi = apiService as any as {
  get: any;
  post: any;
  put: any;
  delete: any;
};

describe('usersService', () => {
  beforeEach(() => {
    mockedApi.get.mockReset();
    mockedApi.post.mockReset();
    mockedApi.put.mockReset();
    mockedApi.delete.mockReset();
  });

  it('getAll should GET /users', async () => {
    const users: User[] = [
      { workEmail: 'a@example.com', firstName: 'A', lastName: 'One' },
    ];
    mockedApi.get.mockResolvedValueOnce(users);

    const result = await usersService.getAll();

    expect(mockedApi.get).toHaveBeenCalledTimes(1);
    expect(mockedApi.get).toHaveBeenCalledWith('/users');
    expect(result).toEqual(users);
  });

  it('createUser should POST /users with body', async () => {
    const user: User = {
      workEmail: 'b@example.com',
      firstName: 'B',
      lastName: 'Two',
      userThumbnail: '/img.png',
      location: 'Remote',
    };
    mockedApi.post.mockResolvedValueOnce(undefined);

    await usersService.createUser(user);

    expect(mockedApi.post).toHaveBeenCalledTimes(1);
    expect(mockedApi.post).toHaveBeenCalledWith('/users', user);
  });

  it('createBulkUsers should POST /users with array payload', async () => {
    const users: User[] = [
      { workEmail: 'c@example.com', firstName: 'C', lastName: 'Three' },
      { workEmail: 'd@example.com', firstName: 'D', lastName: 'Four' },
    ];
    mockedApi.post.mockResolvedValueOnce(undefined);

    await usersService.createBulkUsers(users);

    expect(mockedApi.post).toHaveBeenCalledTimes(1);
    expect(mockedApi.post).toHaveBeenCalledWith('/users', users);
  });

  it('deleteUser should DELETE /users/:email (encoded)', async () => {
    mockedApi.delete.mockResolvedValueOnce(undefined);

    await usersService.deleteUser('first.last+tag@example.com');

    expect(mockedApi.delete).toHaveBeenCalledTimes(1);
    expect(mockedApi.delete).toHaveBeenCalledWith(
      '/users/' + encodeURIComponent('first.last+tag@example.com'),
    );
  });
});
