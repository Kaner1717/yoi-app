import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, PanResponder, Animated, LayoutChangeEvent, Platform } from 'react-native';
import { theme } from '@/constants/theme';

interface SliderControlProps {
  min: number;
  max: number;
  value: number;
  step?: number;
  onValueChange: (value: number) => void;
  formatValue?: (value: number) => string;
  testID?: string;
}

export function SliderControl({
  min,
  max,
  value,
  step = 1,
  onValueChange,
  formatValue = (v) => `$${v}`,
  testID,
}: SliderControlProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const containerWidthRef = useRef(0);
  const containerLeftRef = useRef(0);
  const position = useRef(new Animated.Value(0)).current;
  
  const progress = (value - min) / (max - min);
  
  const handleLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    setContainerWidth(width);
    containerWidthRef.current = width;
    position.setValue(progress * width);
  };

  const calculateValue = useCallback((pageX: number) => {
    const width = containerWidthRef.current;
    if (width === 0) return value;
    const newX = Math.max(0, Math.min(pageX - containerLeftRef.current, width));
    position.setValue(newX);
    const newProgress = newX / width;
    const newValue = Math.round((min + newProgress * (max - min)) / step) * step;
    return Math.max(min, Math.min(max, newValue));
  }, [min, max, step, value, position]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const newValue = calculateValue(evt.nativeEvent.pageX);
        onValueChange(newValue);
      },
      onPanResponderMove: (evt) => {
        const newValue = calculateValue(evt.nativeEvent.pageX);
        onValueChange(newValue);
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  const handleContainerLayout = (event: LayoutChangeEvent) => {
    if (Platform.OS !== 'web') {
      event.target.measure?.((_x, _y, _width, _height, pageX) => {
        containerLeftRef.current = pageX ?? 0;
      });
    } else {
      containerLeftRef.current = event.nativeEvent.layout.x;
    }
    handleLayout(event);
  };

  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.valueText}>{formatValue(value)}</Text>
      <Text style={styles.label}>per week</Text>
      
      <View style={styles.sliderContainer} onLayout={handleContainerLayout} {...panResponder.panHandlers}>
        <View style={styles.track}>
          <View style={[styles.trackFill, { width: `${progress * 100}%` }]} />
        </View>
        <Animated.View
          style={[
            styles.thumb,
            {
              left: position.interpolate({
                inputRange: [0, containerWidth || 1],
                outputRange: [-12, (containerWidth || 1) - 12],
                extrapolate: 'clamp',
              }),
            },
          ]}
        />
      </View>
      
      <View style={styles.labelsContainer}>
        <Text style={styles.minMaxLabel}>{formatValue(min)}</Text>
        <Text style={styles.minMaxLabel}>{formatValue(max)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  valueText: {
    fontSize: theme.typography.fontSize.xxxl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xxs,
  },
  label: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xl,
  },
  sliderContainer: {
    width: '100%',
    height: 40,
    justifyContent: 'center',
  },
  track: {
    height: 6,
    backgroundColor: theme.colors.border,
    borderRadius: theme.borderRadius.full,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
  },
  thumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    top: 8,
    ...theme.shadows.md,
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: theme.spacing.sm,
  },
  minMaxLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
  },
});
