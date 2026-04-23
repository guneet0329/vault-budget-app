import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../ThemeContext';
import { EMOJIS, radius } from '../theme';

const VISIBLE_COUNT = 10; // always shown

/**
 * Shared emoji picker used in ManageWalletsScreen, GoalsScreen, GiftCardsScreen, etc.
 *
 * Props:
 *   selected   – currently selected emoji string
 *   onSelect   – (emoji) => void
 *   emojis     – optional custom array (defaults to EMOJIS from theme)
 *   label      – optional section label (defaults to 'Icon')
 */
export default function EmojiPicker({ selected, onSelect, emojis, label = 'Icon' }) {
  const { colors } = useTheme();
  const list = emojis ?? EMOJIS;
  const [expanded, setExpanded] = useState(false);

  const visible  = expanded ? list : list.slice(0, VISIBLE_COUNT);
  const hasMore  = list.length > VISIBLE_COUNT;

  return (
    <View style={{ marginBottom: 14 }}>
      {label ? (
        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text3, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
          {label}
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {visible.map((e) => (
          <TouchableOpacity
            key={`emoji-${e}`}
            style={{
              width: 44, height: 44, borderRadius: 10,
              backgroundColor: selected === e ? colors.tealLight : colors.surface2,
              borderWidth: 1.5,
              borderColor: selected === e ? colors.teal : 'transparent',
              alignItems: 'center', justifyContent: 'center',
            }}
            onPress={() => onSelect(e)}
          >
            <Text style={{ fontSize: 22 }}>{e}</Text>
          </TouchableOpacity>
        ))}

        {/* Show more / less toggle button */}
        {hasMore && (
          <TouchableOpacity
            style={{
              width: 44, height: 44, borderRadius: 10,
              backgroundColor: colors.surface2,
              alignItems: 'center', justifyContent: 'center',
              borderWidth: 1.5, borderColor: 'transparent',
            }}
            onPress={() => setExpanded(v => !v)}
          >
            <Text style={{ fontSize: 16, color: colors.text3 }}>{expanded ? '▲' : '▼'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {hasMore && (
        <TouchableOpacity onPress={() => setExpanded(v => !v)} style={{ marginTop: 6 }}>
          <Text style={{ fontSize: 11, color: colors.teal, fontWeight: '600' }}>
            {expanded ? 'Show fewer' : `+${list.length - VISIBLE_COUNT} more icons`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
