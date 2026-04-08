
export default {
  getItem: jest.fn(async () => 'mock-device-id'),
  setItem: jest.fn(async () => {}),
  removeItem: jest.fn(async () => {}),
  clear: jest.fn(async () => {}),
};
