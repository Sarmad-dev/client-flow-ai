import { useTheme } from '@/contexts/ThemeContext';
import { Text, useWindowDimensions } from 'react-native';
import RenderHTML from 'react-native-render-html';

export const MessageContent = ({
  html,
  text,
}: {
  html?: string | null;
  text?: string | null;
}) => {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const contentWidth = Math.max(10, Math.min(width * 0.8 - 24, width - 32));
  if (html && html.trim().length > 0) {
    return (
      <RenderHTML
        contentWidth={contentWidth}
        source={{ html: `<div>${html}</div>` }}
        baseStyle={{ color: colors.text, fontSize: 16, lineHeight: 22 }}
        tagsStyles={{ body: { margin: 0, padding: 0 } }}
        renderersProps={{ img: { enableExperimentalPercentWidth: true } }}
      />
    );
  }
  return <Text style={{ color: colors.textSecondary }}>{text || ''}</Text>;
};
