import { useWindowDimensions } from 'react-native';

export type DeviceType = 'mobile' | 'tablet';

export const useDeviceType = (): DeviceType => {
  const { width } = useWindowDimensions();
  // Standard tablet threshold: 768px (iPad Mini width)
  return width >= 768 ? 'tablet' : 'mobile';
};
