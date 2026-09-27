import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import { useApp } from "../state/AppContext";

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const IN_MS = 240;
const OUT_MS = 190;

/**
 * Alttan açılan sayfa. RN Modal'ın "slide" animasyonu arkadaki karartmayı da
 * aşağıdan kaydırır; bu yüzden Modal animasyonsuz açılır, karartma yerinde
 * fade ile belirir ve yalnızca kart aşağıdan kayar. Kapanışta tersi oynar,
 * Modal animasyon bitince kaldırılır.
 */
export default function BottomSheet({ visible, onClose, children }: Props) {
  const { theme } = useApp();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: windowH } = useWindowDimensions();

  const [mounted, setMounted] = useState(visible);
  const [sheetH, setSheetH] = useState(0);
  const fade = useRef(new Animated.Value(0)).current;
  // 0 = yerinde, 1 = ekranın altında
  const slide = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(fade, {
          toValue: 1,
          duration: IN_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(slide, {
          toValue: 0,
          duration: IN_MS + 60,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 0,
        duration: OUT_MS,
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 1,
        duration: OUT_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [visible, fade, slide]);

  // Ölçülene kadar ekran yüksekliği kadar aşağıda başlar (ilk karede görünmez).
  const translateY = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, sheetH || windowH],
  });

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
        />
      </Animated.View>
      <Animated.View
        onLayout={(e) => setSheetH(e.nativeEvent.layout.height)}
        style={[
          styles.sheet,
          {
            backgroundColor: theme.cardSolid,
            borderColor: theme.border,
            paddingBottom: Math.max(insets.bottom, 18) + 26,
            transform: [{ translateY }],
          },
        ]}
      >
        {children}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5,4,15,0.7)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 26,
  },
});
