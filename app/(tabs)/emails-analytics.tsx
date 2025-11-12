import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { useEmailStats, useEmailActivity } from '@/hooks/useEmails';
import { CartesianChart, Bar } from 'victory-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { SubscriptionModal } from '@/components/SubscriptionModal';

export default function EmailsAnalyticsScreen() {
  const { colors } = useTheme();
  const { data: stats } = useEmailStats();

  const {
    guardAnalyticsAccess,
    showSubscriptionModal,
    setShowSubscriptionModal,
    modalFeatureName,
  } = useSubscriptionGuard();

  const [range, setRange] = useState<'7d' | '14d' | '30d' | 'custom'>('7d');
  const startOfDay = (d: Date) => new Date(new Date(d).setHours(0, 0, 0, 0));
  const endOfDay = (d: Date) => new Date(new Date(d).setHours(23, 59, 59, 999));
  const today = new Date();
  const [start, setStart] = useState(() =>
    startOfDay(new Date(today.getTime() - 6 * 86400000))
  );
  const [end, setEnd] = useState(() => endOfDay(today));
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);

  // Adjust dates when range changes
  const applyPreset = (preset: typeof range) => {
    setRange(preset);
    const now = new Date();
    if (preset === '7d') {
      setStart(startOfDay(new Date(now.getTime() - 6 * 86400000)));
      setEnd(endOfDay(now));
    } else if (preset === '14d') {
      setStart(startOfDay(new Date(now.getTime() - 13 * 86400000)));
      setEnd(endOfDay(now));
    } else if (preset === '30d') {
      setStart(startOfDay(new Date(now.getTime() - 29 * 86400000)));
      setEnd(endOfDay(now));
    }
  };

  const { data: activity = [] } = useEmailActivity(start, end);
  const [selected, setSelected] = useState<{
    date: string;
    sent: number;
    opened: number;
    clicked: number;
    replied: number;
  } | null>(null);

  const fmt = (isoDate: string) => {
    const d = new Date(isoDate + 'T00:00:00');
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const width = Dimensions.get('window').width - 32;
  const labelEvery = Math.max(1, Math.ceil(activity.length / 7));
  const barWidthPx = Math.max(
    10,
    Math.floor((width - 40) / Math.min(activity.length || 1, 12))
  );

  const chartInput = useMemo(
    () =>
      activity.map((p, i) => ({
        idx: i + 1,
        date: p.date,
        sent: p.sent,
        delivered: p.delivered,
        opened: p.opened,
        clicked: p.clicked,
        replied: p.replied,
      })),
    [activity]
  );

  const chartData = useMemo(() => {
    const d = [
      { label: 'Total', value: stats?.total ?? 0 },
      { label: 'Delivered', value: stats?.delivered ?? 0 },
      { label: 'Opened', value: stats?.opened ?? 0 },
      { label: 'Clicked', value: stats?.clicked ?? 0 },
      { label: 'Replied', value: stats?.replied ?? 0 },
    ];
    const max = Math.max(1, ...d.map((x) => x.value));
    return { d, max };
  }, [stats]);

  // Check if user has access to analytics
  if (!guardAnalyticsAccess()) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
          }}
        >
          <Text
            style={[styles.title, { color: colors.text, textAlign: 'center' }]}
          >
            Analytics Access Required
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              textAlign: 'center',
              marginTop: 8,
            }}
          >
            Upgrade to Pro to access email analytics and insights.
          </Text>
        </View>
        <SubscriptionModal
          visible={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
          featureName={modalFeatureName}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <Text style={[styles.title, { color: colors.text }]}>
          Email Analytics
        </Text>

        {/* Range selectors */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(
            [
              { k: '7d', label: '7d' },
              { k: '14d', label: '14d' },
              { k: '30d', label: '30d' },
              { k: 'custom', label: 'Custom' },
            ] as const
          ).map(({ k, label }) => (
            <TouchableOpacity
              key={k}
              onPress={() =>
                k === 'custom' ? setRange('custom') : applyPreset(k)
              }
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: range === k ? colors.surface : 'transparent',
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: colors.text, fontWeight: '700' }}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {range === 'custom' && (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              onPress={() => setShowStart(true)}
              style={[styles.dateBtn, { borderColor: colors.border }]}
            >
              <Text style={{ color: colors.text }}>
                {start.toISOString().slice(0, 10)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowEnd(true)}
              style={[styles.dateBtn, { borderColor: colors.border }]}
            >
              <Text style={{ color: colors.text }}>
                {end.toISOString().slice(0, 10)}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {showStart && (
          <DateTimePicker
            value={start}
            mode="date"
            onChange={(_, d) => {
              setShowStart(false);
              if (d) setStart(new Date(d.setHours(0, 0, 0, 0)));
            }}
          />
        )}
        {showEnd && (
          <DateTimePicker
            value={end}
            mode="date"
            onChange={(_, d) => {
              setShowEnd(false);
              if (d) setEnd(new Date(d.setHours(23, 59, 59, 999)));
            }}
          />
        )}

        {/* Number tiles */}
        <View style={styles.tilesRow}>
          {chartData.d.map((x) => (
            <View
              key={x.label}
              style={[
                styles.tile,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.tileValue, { color: colors.text }]}>
                {x.value}
              </Text>
              <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>
                {x.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Date-wise animated charts */}
        <View
          style={[
            styles.chartCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.chartTitle, { color: colors.text }]}>
            Events by Date
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              marginBottom: 8,
            }}
          >
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: '#10B981',
                }}
              />
              <Text style={{ color: colors.textSecondary }}>Sent</Text>
            </View>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: '#3B82F6',
                }}
              />
              <Text style={{ color: colors.textSecondary }}>Opened</Text>
            </View>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: '#F59E0B',
                }}
              />
              <Text style={{ color: colors.textSecondary }}>Clicked</Text>
            </View>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: '#EF4444',
                }}
              />
              <Text style={{ color: colors.textSecondary }}>Replied</Text>
            </View>
          </View>
          <View style={{ height: 200 }}>
            <CartesianChart
              data={chartInput}
              xKey="idx"
              yKeys={['sent']}
              domainPadding={{ left: 24, right: 24, top: 12, bottom: 12 }}
              axisOptions={{
                secondary: {
                  yAxis: [{ tickCount: 4 }],
                },
                labelRotate: 0,
              }}
            >
              {({ points, chartBounds }: any) => (
                <Bar
                  points={points.sent}
                  chartBounds={chartBounds}
                  color="#10B981"
                  roundedCorners={{ topLeft: 6, topRight: 6 }}
                />
              )}
            </CartesianChart>
          </View>
          <Text
            style={{
              color: colors.textSecondary,
              marginTop: 8,
              marginBottom: 4,
            }}
          >
            Delivered
          </Text>
          <View style={{ height: 200 }}>
            <CartesianChart
              data={chartInput}
              xKey="idx"
              yKeys={['delivered']}
              domainPadding={{ left: 24, right: 24, top: 12, bottom: 12 }}
              axisOptions={{
                secondary: {
                  yAxis: [{ tickCount: 4 }],
                },
              }}
            >
              {({ points, chartBounds }: any) => (
                <Bar
                  points={points.delivered}
                  chartBounds={chartBounds}
                  color="#22C55E"
                  roundedCorners={{ topLeft: 6, topRight: 6 }}
                />
              )}
            </CartesianChart>
          </View>
          <Text
            style={{
              color: colors.textSecondary,
              marginTop: 8,
              marginBottom: 4,
            }}
          >
            Opened
          </Text>
          <View style={{ height: 200 }}>
            <CartesianChart
              data={chartInput}
              xKey="idx"
              yKeys={['opened']}
              domainPadding={{ left: 24, right: 24, top: 12, bottom: 12 }}
              axisOptions={{
                secondary: {
                  yAxis: [{ tickCount: 4 }],
                },
              }}
            >
              {({ points, chartBounds }: any) => (
                <Bar
                  points={points.opened}
                  chartBounds={chartBounds}
                  color="#3B82F6"
                  roundedCorners={{ topLeft: 6, topRight: 6 }}
                />
              )}
            </CartesianChart>
          </View>
          <Text
            style={{
              color: colors.textSecondary,
              marginTop: 8,
              marginBottom: 4,
            }}
          >
            Clicked
          </Text>
          <View style={{ height: 200 }}>
            <CartesianChart
              data={chartInput}
              xKey="idx"
              yKeys={['clicked']}
              domainPadding={{ left: 24, right: 24, top: 12, bottom: 12 }}
              axisOptions={{
                secondary: {
                  yAxis: [{ tickCount: 4 }],
                },
              }}
            >
              {({ points, chartBounds }: any) => (
                <Bar
                  points={points.clicked}
                  chartBounds={chartBounds}
                  color="#F59E0B"
                  roundedCorners={{ topLeft: 6, topRight: 6 }}
                />
              )}
            </CartesianChart>
          </View>
          <Text
            style={{
              color: colors.textSecondary,
              marginTop: 8,
              marginBottom: 4,
            }}
          >
            Replied
          </Text>
          <View style={{ height: 200 }}>
            <CartesianChart
              data={chartInput}
              xKey="idx"
              yKeys={['replied']}
              domainPadding={{ left: 24, right: 24, top: 12, bottom: 12 }}
              axisOptions={{
                secondary: {
                  yAxis: [{ tickCount: 4 }],
                },
              }}
            >
              {({ points, chartBounds }: any) => (
                <Bar
                  points={points.replied}
                  chartBounds={chartBounds}
                  color="#EF4444"
                  roundedCorners={{ topLeft: 6, topRight: 6 }}
                />
              )}
            </CartesianChart>
          </View>

          {selected && (
            <View
              style={{
                marginTop: 8,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                borderRadius: 8,
                padding: 10,
              }}
            >
              <Text style={{ color: colors.text, fontWeight: '700' }}>
                {fmt(selected.date)}
              </Text>
              <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
                Sent: {selected.sent}
              </Text>
              <Text style={{ color: colors.textSecondary }}>
                Opened: {selected.opened}
              </Text>
              <Text style={{ color: colors.textSecondary }}>
                Clicked: {selected.clicked}
              </Text>
              <Text style={{ color: colors.textSecondary }}>
                Replied: {selected.replied}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <SubscriptionModal
        visible={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        featureName={modalFeatureName}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 24, fontWeight: '800' },
  tilesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minWidth: 120,
    flexGrow: 1,
    alignItems: 'center',
    gap: 4,
  },
  tileValue: { fontSize: 22, fontWeight: '800' },
  chartCard: { borderWidth: 1, borderRadius: 12, padding: 12 },
  chartTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  dateBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  chartLabelsRow: { flexDirection: 'row', marginTop: 8 },
  chartLabel: { fontSize: 12, textAlign: 'center' },
});
