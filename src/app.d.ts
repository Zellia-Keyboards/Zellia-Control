// See https://kit.svelte.dev/docs/types#app

// WebUSB API type declarations
declare global {
  interface Navigator {
    usb: USB;
  }

  interface USB {
    requestDevice(options: USBDeviceRequestOptions): Promise<USBDevice>;
    getDevices(): Promise<USBDevice[]>;
  }

  interface USBDeviceRequestOptions {
    filters: USBDeviceFilter[];
  }

  interface USBDeviceFilter {
    vendorId?: number;
    productId?: number;
    classCode?: number;
    subclassCode?: number;
    protocolCode?: number;
    serialNumber?: string;
  }

  interface USBDevice {
    productName?: string;
    manufacturerName?: string;
    open(): Promise<void>;
    close(): Promise<void>;
    selectConfiguration(configurationValue: number): Promise<void>;
    claimInterface(interfaceNumber: number): Promise<void>;
    releaseInterface(interfaceNumber: number): Promise<void>;
    transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>;
    transferIn(endpointNumber: number, length: number): Promise<USBInTransferResult>;
    controlTransferOut(
      setup: USBControlTransferParameters,
      data?: BufferSource
    ): Promise<USBOutTransferResult>;
    controlTransferIn(
      setup: USBControlTransferParameters,
      length: number
    ): Promise<USBInTransferResult>;
    reset(): Promise<void>;
  }

  interface USBOutTransferResult {
    status: USBTransferStatus;
  }

  interface USBInTransferResult {
    data: DataView;
    status: USBTransferStatus;
  }

  type USBTransferStatus = 'ok' | 'stall' | 'babble';

  interface USBControlTransferParameters {
    requestType: USBRequestType;
    recipient: USBRecipient;
    request: number;
    value: number;
    index: number;
  }

  type USBRequestType = 'standard' | 'class' | 'vendor' | 'reserved';
  type USBRecipient = 'device' | 'interface' | 'endpoint' | 'other';
}

export {};
