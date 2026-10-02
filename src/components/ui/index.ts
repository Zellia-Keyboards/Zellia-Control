/** Shared UI primitives ported from the Svelte app (markup and classes unchanged). */
export { ConfirmationModal, type ConfirmationModalProps } from './ConfirmationModal';
export { ErrorModal, type ErrorModalProps } from './ErrorModal';
// The action picker of the Dynamic Keys editors and the Macros page.
export {
  KeycodePicker,
  type KeycodePickerAction,
  type KeycodePickerCategory,
  type KeycodePickerProps,
} from './KeycodePicker';
export { Modal, type ModalMaxWidth, type ModalProps } from './Modal';
export { NoKeySelected, type NoKeySelectedProps } from './NoKeySelected';
export { ThemedSlider, type ThemedSliderProps } from './ThemedSlider';
export { Toggle, type ToggleProps } from './Toggle';
export { useModalDismiss } from './use-modal-dismiss';
// Performance controls shared by the Performance page and the Dynamic Keys performance tabs
// (the Svelte app used the same components/performance/* components in both).
export { ActuationPointControl, type ActuationPointControlProps } from './ActuationPointControl';
export { DeadzoneControl, type DeadzoneControlProps } from './DeadzoneControl';
export { RapidTriggerToggle, type RapidTriggerToggleProps } from './RapidTriggerToggle';
export { SensitivityControl, type SensitivityControlProps } from './SensitivityControl';
// The Macros and Scripts pages on keyboards without the feature.
export { UnsupportedFeature, type UnsupportedFeatureProps } from './UnsupportedFeature';
// The bordered secondary button the Macros and Scripts pages compose themselves.
export { SECONDARY_BUTTON } from './button-styles';
