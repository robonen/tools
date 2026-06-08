/**
 * Ambient type shims for browser APIs that are not (yet) part of TypeScript's
 * bundled `lib.dom.d.ts`. Declared globally so composables can reference them
 * as bare types without importing. Keep these minimal — only the surface the
 * toolkit actually consumes.
 */

declare global {
  // ---- Web Bluetooth API (https://webbluetoothcg.github.io/web-bluetooth/) ----

  type BluetoothServiceUUID = number | string;
  type BluetoothCharacteristicUUID = number | string;
  type BluetoothDescriptorUUID = number | string;

  interface BluetoothDataFilter {
    readonly dataPrefix?: BufferSource;
    readonly mask?: BufferSource;
  }

  interface BluetoothManufacturerDataFilter extends BluetoothDataFilter {
    companyIdentifier: number;
  }

  interface BluetoothServiceDataFilter extends BluetoothDataFilter {
    service: BluetoothServiceUUID;
  }

  interface BluetoothLEScanFilter {
    readonly name?: string;
    readonly namePrefix?: string;
    readonly services?: BluetoothServiceUUID[];
    readonly manufacturerData?: BluetoothManufacturerDataFilter[];
    readonly serviceData?: BluetoothServiceDataFilter[];
  }

  interface RequestDeviceOptions {
    filters?: BluetoothLEScanFilter[];
    optionalServices?: BluetoothServiceUUID[];
    optionalManufacturerData?: number[];
    acceptAllDevices?: boolean;
  }

  interface BluetoothRemoteGATTServer {
    readonly device: BluetoothDevice;
    readonly connected: boolean;
    connect: () => Promise<BluetoothRemoteGATTServer>;
    disconnect: () => void;
    getPrimaryService: (service: BluetoothServiceUUID) => Promise<BluetoothRemoteGATTService>;
    getPrimaryServices: (service?: BluetoothServiceUUID) => Promise<BluetoothRemoteGATTService[]>;
  }

  interface BluetoothRemoteGATTService extends EventTarget {
    readonly device: BluetoothDevice;
    readonly uuid: string;
    readonly isPrimary: boolean;
    getCharacteristic: (characteristic: BluetoothCharacteristicUUID) => Promise<BluetoothRemoteGATTCharacteristic>;
    getCharacteristics: (characteristic?: BluetoothCharacteristicUUID) => Promise<BluetoothRemoteGATTCharacteristic[]>;
  }

  interface BluetoothRemoteGATTCharacteristic extends EventTarget {
    readonly service: BluetoothRemoteGATTService;
    readonly uuid: string;
    readonly value?: DataView;
    readValue: () => Promise<DataView>;
    writeValue: (value: BufferSource) => Promise<void>;
    startNotifications: () => Promise<BluetoothRemoteGATTCharacteristic>;
    stopNotifications: () => Promise<BluetoothRemoteGATTCharacteristic>;
  }

  interface BluetoothDevice extends EventTarget {
    readonly id: string;
    readonly name?: string;
    readonly gatt?: BluetoothRemoteGATTServer;
    watchAdvertisements: () => Promise<void>;
    forget: () => Promise<void>;
  }

  interface Bluetooth extends EventTarget {
    getAvailability: () => Promise<boolean>;
    getDevices: () => Promise<BluetoothDevice[]>;
    requestDevice: (options?: RequestDeviceOptions) => Promise<BluetoothDevice>;
  }

  interface Navigator {
    readonly bluetooth?: Bluetooth;
  }

  // ---- Gamepad haptics (not in lib.dom yet) ----

  interface Gamepad {
    readonly hapticActuators?: readonly GamepadHapticActuator[];
  }
}

export {};
