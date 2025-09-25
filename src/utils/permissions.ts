import { Platform, Alert } from 'react-native';
import { 
  PERMISSIONS, 
  RESULTS, 
  request, 
  requestMultiple, 
  check, 
  Permission,
  PermissionStatus 
} from 'react-native-permissions';
import * as Notifications from 'expo-notifications';

export interface PermissionResult {
  bluetooth: PermissionStatus;
  location: PermissionStatus;
  camera: PermissionStatus;
  notifications: PermissionStatus;
}

export class PermissionManager {
  private static instance: PermissionManager;
  
  public static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  /**
   * Get the required permissions for the current platform
   */
  private getRequiredPermissions(): Permission[] {
    if (Platform.OS === 'ios') {
      return [
        PERMISSIONS.IOS.BLUETOOTH,
        PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
        PERMISSIONS.IOS.CAMERA,
      ];
    } else {
      return [
        PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
        PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
        PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
        PERMISSIONS.ANDROID.CAMERA,
        PERMISSIONS.ANDROID.POST_NOTIFICATIONS,
      ];
    }
  }

  /**
   * Check if all required permissions are granted
   */
  async checkAllPermissions(): Promise<boolean> {
    const permissions = this.getRequiredPermissions();
    const results = await Promise.all(
      permissions.map(permission => check(permission))
    );
    
    return results.every(result => result === RESULTS.GRANTED);
  }

  /**
   * Request all required permissions
   */
  async requestAllPermissions(): Promise<PermissionResult> {
    const permissions = this.getRequiredPermissions();
    
    try {
      const results = await requestMultiple(permissions);
      
      // Also request notification permissions through Expo
      const notificationStatus = await this.requestNotificationPermission();
      
      return {
        bluetooth: results[PERMISSIONS.IOS.BLUETOOTH] || 
                   results[PERMISSIONS.ANDROID.BLUETOOTH_SCAN] || 
                   RESULTS.DENIED,
        location: results[PERMISSIONS.IOS.LOCATION_WHEN_IN_USE] || 
                  results[PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION] || 
                  RESULTS.DENIED,
        camera: results[PERMISSIONS.IOS.CAMERA] || 
                results[PERMISSIONS.ANDROID.CAMERA] || 
                RESULTS.DENIED,
        notifications: notificationStatus,
      };
    } catch (error) {
      console.error('Error requesting permissions:', error);
      throw error;
    }
  }

  /**
   * Request notification permissions through Expo
   */
  private async requestNotificationPermission(): Promise<PermissionStatus> {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted' ? RESULTS.GRANTED : RESULTS.DENIED;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return RESULTS.DENIED;
    }
  }

  /**
   * Check individual permission status
   */
  async checkPermission(permission: Permission): Promise<PermissionStatus> {
    return await check(permission);
  }

  /**
   * Request individual permission
   */
  async requestPermission(permission: Permission): Promise<PermissionStatus> {
    return await request(permission);
  }

  /**
   * Show permission explanation dialog
   */
  showPermissionExplanation(permissionType: 'bluetooth' | 'location' | 'camera' | 'notifications'): void {
    let title = '';
    let message = '';

    switch (permissionType) {
      case 'bluetooth':
        title = 'Bluetooth Permission Required';
        message = 'This app needs Bluetooth access to scan for nearby luggage tracking devices.';
        break;
      case 'location':
        title = 'Location Permission Required';
        message = 'This app needs location access to use Bluetooth scanning features.';
        break;
      case 'camera':
        title = 'Camera Permission Required';
        message = 'This app needs camera access to scan QR codes on your luggage.';
        break;
      case 'notifications':
        title = 'Notification Permission Required';
        message = 'This app needs notification access to alert you about luggage proximity changes.';
        break;
    }

    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Settings', 
          onPress: () => {
            // This would typically open device settings
            console.log('Open settings for permission');
          }
        }
      ]
    );
  }

  /**
   * Check if permission is permanently denied
   */
  isPermissionPermanentlyDenied(status: PermissionStatus): boolean {
    return status === RESULTS.BLOCKED || status === RESULTS.UNAVAILABLE;
  }

  /**
   * Get permission status text for display
   */
  getPermissionStatusText(status: PermissionStatus): string {
    switch (status) {
      case RESULTS.GRANTED:
        return 'Granted';
      case RESULTS.DENIED:
        return 'Denied';
      case RESULTS.BLOCKED:
        return 'Blocked';
      case RESULTS.UNAVAILABLE:
        return 'Unavailable';
      case RESULTS.LIMITED:
        return 'Limited';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get permission status color for display
   */
  getPermissionStatusColor(status: PermissionStatus): string {
    switch (status) {
      case RESULTS.GRANTED:
        return '#4CAF50'; // Green
      case RESULTS.DENIED:
        return '#FF9800'; // Orange
      case RESULTS.BLOCKED:
        return '#F44336'; // Red
      case RESULTS.UNAVAILABLE:
        return '#9E9E9E'; // Gray
      case RESULTS.LIMITED:
        return '#2196F3'; // Blue
      default:
        return '#9E9E9E'; // Gray
    }
  }
}

// Export singleton instance
export const permissionManager = PermissionManager.getInstance();
export default permissionManager;
