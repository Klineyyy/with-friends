import { Heart } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/theme";

type Props = { liked: boolean; onChange: (liked: boolean) => void };

/**
 * The app's only animation: the heart pops once in fern when it becomes liked
 * (scale 1 → 1.2 → 1, ~200 ms). Skipped with reduced motion. design.md §1.
 */
export function LikeButton({ liked, onChange }: Props) {
  const colors = useColors();
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const wasLiked = useRef(liked);

  // Pop on every unliked → liked change, including a double-tap on the photo.
  useEffect(() => {
    if (liked && !wasLiked.current && !reduceMotion) {
      scale.value = withSequence(withTiming(1.2, { duration: 100 }), withTiming(1, { duration: 100 }));
    }
    wasLiked.current = liked;
  }, [liked, reduceMotion, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={liked ? "Unlike" : "Like"}
      accessibilityState={{ selected: liked }}
      onPress={() => onChange(!liked)}
      hitSlop={10}
      style={styles.target}
    >
      <Animated.View style={style}>
        <Heart
          size={24}
          strokeWidth={1.75}
          color={liked ? colors.fern : colors.text}
          fill={liked ? colors.fern : "transparent"}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  target: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
});
