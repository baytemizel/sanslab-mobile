import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  type TextInputProps,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { useApp } from "../state/AppContext";
import { fonts } from "../theme/colors";

type FeatherName = React.ComponentProps<typeof Feather>["name"];

interface Props extends Omit<TextInputProps, "style"> {
  label: string;
  icon?: FeatherName;
  error?: string | null;
  /** Şifre alanı: göz ikonu ile gizle/göster. */
  secure?: boolean;
}

/** Tema uyumlu form alanı — auth ekranlarında kullanılır. */
export default function Field({
  label,
  icon,
  error,
  secure,
  ...input
}: Props) {
  const { theme } = useApp();
  const [hidden, setHidden] = useState(Boolean(secure));
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? "#F5333B"
    : focused
    ? theme.goldFill
    : theme.border;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: theme.subText }]}>{label}</Text>
      <View
        style={[
          styles.box,
          {
            backgroundColor: theme.card,
            borderColor,
            borderWidth: focused || error ? 1.6 : 1,
          },
        ]}
      >
        {icon && (
          <Feather name={icon} size={17} color={theme.subText} style={styles.icon} />
        )}
        <TextInput
          {...input}
          secureTextEntry={hidden}
          placeholderTextColor={theme.subText}
          onFocus={(e) => {
            setFocused(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            input.onBlur?.(e);
          }}
          style={[styles.input, { color: theme.text }]}
        />
        {secure && (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={label}
          >
            <Feather
              name={hidden ? "eye" : "eye-off"}
              size={17}
              color={theme.subText}
            />
          </Pressable>
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: {
    fontSize: 11.5,
    fontFamily: fonts.bodyBold,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  box: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
    gap: 10,
  },
  icon: { width: 18 },
  input: { flex: 1, fontSize: 15.5, fontFamily: fonts.bodyMed, height: "100%" },
  error: {
    color: "#F5333B",
    fontSize: 12,
    fontFamily: fonts.bodyMed,
    marginTop: 6,
    marginLeft: 2,
  },
});
