import React, { forwardRef } from "react";
import {
  Text as NativeText,
  TextInput as NativeTextInput,
  Platform,
  type TextInputProps,
  type TextProps,
} from "react-native";
import { useI18n } from "./index";

function translateChildren(value: React.ReactNode, t: (source: string) => string): React.ReactNode {
  if (typeof value === "string") return t(value);
  if (Array.isArray(value)) return value.map((child, index) => (
    <React.Fragment key={index}>{translateChildren(child, t)}</React.Fragment>
  ));
  return value;
}

export const Text = forwardRef<React.ElementRef<typeof NativeText>, TextProps>(function Text(
  { children, ...props },
  ref
) {
  const { t, language } = useI18n();
  const localeStyle = language === "ja"
    ? { fontFamily: Platform.select({ ios: "System", android: "sans-serif" }) }
    : undefined;
  return <NativeText ref={ref} {...props} style={[props.style, localeStyle]}>{translateChildren(children, t)}</NativeText>;
});

export const TextInput = forwardRef<React.ElementRef<typeof NativeTextInput>, TextInputProps>(
  function TextInput({ placeholder, ...props }, ref) {
    const { t, language } = useI18n();
    const localeStyle = language === "ja"
      ? { fontFamily: Platform.select({ ios: "System", android: "sans-serif" }) }
      : undefined;
    return (
      <NativeTextInput
        ref={ref}
        placeholder={placeholder ? t(placeholder) : placeholder}
        {...props}
        style={[props.style, localeStyle]}
      />
    );
  }
);
