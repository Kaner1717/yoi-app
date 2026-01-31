import React, { useRef, useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, NativeSyntheticEvent, NativeScrollEvent, Pressable, Platform } from 'react-native';
import { theme } from '@/constants/theme';

interface WheelPickerProps {
  items: { value: number | string; label: string }[];
  selectedValue: number | string;
  onValueChange: (value: number | string) => void;
  itemHeight?: number;
  visibleItems?: number;
}

export function WheelPicker({
  items,
  selectedValue,
  onValueChange,
  itemHeight = 44,
  visibleItems = 5,
}: WheelPickerProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const containerHeight = itemHeight * visibleItems;
  const paddingVertical = (containerHeight - itemHeight) / 2;
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScrollingRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const lastSelectedValueRef = useRef(selectedValue);
  const itemsRef = useRef(items);

  const [internalIndex, setInternalIndex] = useState(() => {
    const exactIndex = items.findIndex((item) => item.value === selectedValue);
    if (exactIndex >= 0) return exactIndex;
    
    if (typeof selectedValue === 'number' && items.length > 0) {
      let closestIndex = 0;
      let closestDiff = Math.abs((items[0].value as number) - selectedValue);
      for (let i = 1; i < items.length; i++) {
        const diff = Math.abs((items[i].value as number) - selectedValue);
        if (diff < closestDiff) {
          closestDiff = diff;
          closestIndex = i;
        }
      }
      return closestIndex;
    }
    return 0;
  });

  useEffect(() => {
    itemsRef.current = items;
    
    if (items !== itemsRef.current || !hasInitializedRef.current) {
      const exactIndex = items.findIndex((item) => item.value === selectedValue);
      let newIndex = exactIndex >= 0 ? exactIndex : 0;
      
      if (exactIndex < 0 && typeof selectedValue === 'number' && items.length > 0) {
        let closestIndex = 0;
        let closestDiff = Math.abs((items[0].value as number) - selectedValue);
        for (let i = 1; i < items.length; i++) {
          const diff = Math.abs((items[i].value as number) - selectedValue);
          if (diff < closestDiff) {
            closestDiff = diff;
            closestIndex = i;
          }
        }
        newIndex = closestIndex;
      }
      
      setInternalIndex(newIndex);
      
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: newIndex * itemHeight,
          animated: false,
        });
        
        if (items[newIndex] && items[newIndex].value !== selectedValue) {
          onValueChange(items[newIndex].value);
        }
      }, 50);
    }
  }, [items, itemHeight]);

  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: internalIndex * itemHeight,
          animated: false,
        });
      }, 50);
    }
  }, []);

  useEffect(() => {
    if (lastSelectedValueRef.current !== selectedValue && !isScrollingRef.current) {
      lastSelectedValueRef.current = selectedValue;
      const newIndex = items.findIndex((item) => item.value === selectedValue);
      if (newIndex >= 0 && newIndex !== internalIndex) {
        setInternalIndex(newIndex);
        scrollViewRef.current?.scrollTo({
          y: newIndex * itemHeight,
          animated: true,
        });
      }
    }
  }, [selectedValue, items, itemHeight, internalIndex]);

  const commitSelection = useCallback(
    (index: number) => {
      const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
      setInternalIndex(clampedIndex);
      
      if (items[clampedIndex]) {
        lastSelectedValueRef.current = items[clampedIndex].value;
        onValueChange(items[clampedIndex].value);
      }
      
      scrollViewRef.current?.scrollTo({
        y: clampedIndex * itemHeight,
        animated: true,
      });
    },
    [items, itemHeight, onValueChange]
  );

  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / itemHeight);
      isScrollingRef.current = false;
      commitSelection(index);
    },
    [itemHeight, commitSelection]
  );

  const handleScrollBegin = useCallback(() => {
    isScrollingRef.current = true;
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
  }, []);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (Platform.OS === 'web') {
        isScrollingRef.current = true;
        
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        
        const offsetY = event.nativeEvent.contentOffset.y;
        
        scrollTimeoutRef.current = setTimeout(() => {
          isScrollingRef.current = false;
          const index = Math.round(offsetY / itemHeight);
          commitSelection(index);
        }, 150);
      }
    },
    [itemHeight, commitSelection]
  );

  const handleItemPress = useCallback(
    (index: number) => {
      commitSelection(index);
    },
    [commitSelection]
  );

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return (
    <View style={[styles.container, { height: containerHeight }]}>
      <View style={[styles.selector, { top: paddingVertical, height: itemHeight }]} />
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        onScrollBeginDrag={handleScrollBegin}
        onMomentumScrollBegin={handleScrollBegin}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        onScroll={handleScroll}
        scrollEventThrottle={32}
        contentContainerStyle={{ paddingVertical }}
        nestedScrollEnabled
      >
        {items.map((item, index) => {
          const isSelected = index === internalIndex;
          return (
            <Pressable 
              key={`${item.value}-${index}`} 
              style={[styles.item, { height: itemHeight }]}
              onPress={() => handleItemPress(index)}
            >
              <Text style={[styles.itemText, isSelected && styles.itemTextSelected]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  selector: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
    zIndex: -1,
  },
  item: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.text.tertiary,
  },
  itemTextSelected: {
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeight.semiBold,
  },
});
