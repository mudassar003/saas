# Frontend Implementation Guide
## Revenue Projection - Actual vs Projected Split

**Status:** Backend ✅ Complete | Frontend ⚠️ In Progress

---

## 🎯 Changes Completed

### ✅ Backend (Complete)
1. ✅ Installed date-fns library
2. ✅ Updated TypeScript types for actual vs projected
3. ✅ Added new date presets (thisMonth, nextMonth, next30days)
4. ✅ Split API response into actualRevenue and projectedRevenue
5. ✅ Added cutoffDate, daysCompleted, daysRemaining
6. ✅ Merchant filtering maintained throughout

---

## 📝 Frontend Changes Required

### 1. Update Revenue Page (src/app/revenue/page.tsx)

**Current Type:**
```typescript
type DatePreset = '7days' | '30days' | '90days' | 'custom';
```

**NEW Type:**
```typescript
type DatePreset = 'thisMonth' | 'nextMonth' | 'next30days' | 'custom';
```

**Changes:**
```typescript
// Line 10: Update type
type DatePreset = 'thisMonth' | 'nextMonth' | 'next30days' | 'custom';

// Line 39-42: Update default filter
const [filters, setFilters] = useState<FilterState>({
  preset: 'thisMonth', // Changed from '30days'
  startDate: defaultDates.start,
  endDate: defaultDates.end
});

// Line 48-61: Update handlePresetChange
const handlePresetChange = (preset: 'thisMonth' | 'nextMonth' | 'next30days') => {
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  let startDate: Date;
  let endDate: Date;

  switch (preset) {
    case 'thisMonth': {
      const { startOfMonth, endOfMonth } = require('date-fns');
      startDate = startOfMonth(todayUTC);
      endDate = endOfMonth(todayUTC);
      break;
    }
    case 'nextMonth': {
      const { startOfMonth, endOfMonth, addMonths } = require('date-fns');
      const nextMonth = addMonths(todayUTC, 1);
      startDate = startOfMonth(nextMonth);
      endDate = endOfMonth(nextMonth);
      break;
    }
    case 'next30days': {
      startDate = todayUTC;
      endDate = new Date(todayUTC);
      endDate.setUTCDate(endDate.getUTCDate() + 30);
      break;
    }
    default:
      startDate = todayUTC;
      endDate = new Date(todayUTC);
      endDate.setUTCDate(endDate.getUTCDate() + 30);
  }

  setFilters({
    preset,
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  });
};

// Line 77-90: Update handleGenerateReport
const handleGenerateReport = async () => {
  setLoading(true);
  setError(null);

  try {
    const requestBody = filters.preset === 'custom'
      ? { startDate: filters.startDate, endDate: filters.endDate, preset: null }
      : { preset: filters.preset }; // Now sends 'thisMonth', 'nextMonth', or 'next30days'

    const response = await fetch('/api/revenue/projection/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    // Rest remains same...
  }
};
```

---

### 2. Update Revenue Projection Header (src/components/revenue/revenue-projection-header.tsx)

**File Location:** `src/components/revenue/revenue-projection-header.tsx`

**Changes:**
```typescript
// Update filter buttons
<div className="flex gap-2">
  <Button
    variant={filters.preset === 'thisMonth' ? 'default' : 'outline'}
    size="sm"
    onClick={() => onPresetChange('thisMonth')}
    disabled={loading || syncing}
  >
    This Month
  </Button>

  <Button
    variant={filters.preset === 'nextMonth' ? 'default' : 'outline'}
    size="sm"
    onClick={() => onPresetChange('nextMonth')}
    disabled={loading || syncing}
  >
    Next Month
  </Button>

  <Button
    variant={filters.preset === 'next30days' ? 'default' : 'outline'}
    size="sm"
    onClick={() => onPresetChange('next30days')}
    disabled={loading || syncing}
  >
    Next 30 Days
  </Button>
</div>
```

---

### 3. Update Revenue Metrics (src/components/revenue/revenue-metrics.tsx)

**File Location:** `src/components/revenue/revenue-metrics.tsx`

**NEW Component Structure:**
```typescript
interface RevenueMetricsProps {
  dateRange: {
    start: string;
    end: string;
    days: number;
    cutoffDate: string;
    daysCompleted: number;
    daysRemaining: number;
  };
  actualRevenue: {
    total: number;
    transactionCount: number;
    averageTransaction: number;
  };
  projectedRevenue: {
    total: number;
    contractCount: number;
  };
  monthlyTotal: {
    expected: number;
    actualPercentage: number;
    projectedPercentage: number;
  };
  metrics: {
    activeContracts: number;
    monthlyRecurringRevenue: number;
  };
}

export function RevenueMetrics({
  dateRange,
  actualRevenue,
  projectedRevenue,
  monthlyTotal,
  metrics
}: RevenueMetricsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC'
    });
  };

  return (
    <div className="space-y-4">
      {/* Date Range Info */}
      <div className="bg-muted/50 border border-border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Date Range</h3>
            <p className="text-sm text-muted-foreground">
              {formatDate(dateRange.start)} → {formatDate(dateRange.end)} ({dateRange.days} days)
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Today: {formatDate(dateRange.cutoffDate)}</p>
            <p className="text-xs text-muted-foreground">
              {dateRange.daysCompleted} days completed • {dateRange.daysRemaining} days remaining
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Actual Revenue (Past) */}
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-green-600"></div>
            <h3 className="text-sm font-medium text-green-900 dark:text-green-100">
              Actual Revenue
            </h3>
          </div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(actualRevenue.total)}
          </p>
          <div className="mt-2 text-xs text-green-700 dark:text-green-300 space-y-1">
            <p>{actualRevenue.transactionCount} transactions</p>
            <p>Avg: {formatCurrency(actualRevenue.averageTransaction)}</p>
            <p className="font-medium">{monthlyTotal.actualPercentage.toFixed(1)}% of total</p>
          </div>
        </div>

        {/* Projected Revenue (Future) */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-blue-600"></div>
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Projected Revenue
            </h3>
          </div>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {formatCurrency(projectedRevenue.total)}
          </p>
          <div className="mt-2 text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <p>{projectedRevenue.contractCount} expected payments</p>
            <p>MRR: {formatCurrency(metrics.monthlyRecurringRevenue)}</p>
            <p className="font-medium">{monthlyTotal.projectedPercentage.toFixed(1)}% of total</p>
          </div>
        </div>

        {/* Total Expected */}
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-purple-600"></div>
            <h3 className="text-sm font-medium text-purple-900 dark:text-purple-100">
              Total Expected
            </h3>
          </div>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {formatCurrency(monthlyTotal.expected)}
          </p>
          <div className="mt-2 text-xs text-purple-700 dark:text-purple-300 space-y-1">
            <p>{metrics.activeContracts} active contracts</p>
            <p>Actual + Projected</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### 4. Update Projection Chart (src/components/revenue/projection-chart.tsx)

**Changes Required:**
- Accept both `actualRevenue.dailyBreakdown` and `projectedRevenue.upcomingPayments`
- Show actual data as solid green bars
- Show projected data as blue bars
- Add vertical "Today" marker line

**Example:**
```typescript
interface ProjectionChartProps {
  actualDailyBreakdown: DailyProjection[];
  projectedUpcomingPayments: DailyProjection[];
  cutoffDate: string;
  dateRange: {
    start: string;
    end: string;
  };
}

// Combine actual and projected data
const combinedData = [
  ...actualDailyBreakdown.map(d => ({ ...d, type: 'actual' })),
  ...projectedUpcomingPayments.map(d => ({ ...d, type: 'projected' }))
].sort((a, b) => a.date.localeCompare(b.date));

// Chart config
const chartConfig = {
  actual: {
    label: "Actual Revenue",
    color: "#10b981" // green
  },
  projected: {
    label: "Projected Revenue",
    color: "#3b82f6" // blue
  }
};
```

---

### 5. Update Upcoming Payments (src/components/revenue/upcoming-payments.tsx)

**This component should work as-is** because it already accepts `DailyProjection[]` which is the format of `projectedRevenue.upcomingPayments`.

**Verify it receives:**
```typescript
<UpcomingPayments
  payments={projectionData.projectedRevenue.upcomingPayments}
  dateRange={projectionData.dateRange}
/>
```

---

## 🚀 Quick Implementation Steps

1. **Update page.tsx:**
   - Change filter type and defaults
   - Update preset change handler
   - Ensure API receives new preset names

2. **Update header component:**
   - Change button labels (7 Days → This Month, etc.)
   - Update onClick handlers

3. **Update metrics component:**
   - Accept new props structure
   - Display actual vs projected separately
   - Add date range info

4. **Update chart component:**
   - Combine actual + projected data
   - Color code by type
   - Add "Today" marker

5. **Verify critical sections:**
   - Payment Schedule by Product Category
   - Upcoming Payments

---

## ✅ Testing Checklist

After implementation:
- [ ] "This Month" is default filter
- [ ] Shows Dec 1 - Dec 31 range
- [ ] Displays actual revenue (Dec 1-25)
- [ ] Displays projected revenue (Dec 26-31)
- [ ] Total = Actual + Projected
- [ ] Chart shows both actual and projected
- [ ] Product Category breakdown works
- [ ] Upcoming Payments shows future dates only
- [ ] Date labels are correct ("Today", "Tomorrow")
- [ ] Merchant filtering works correctly

---

**Next:** Shall I apply these frontend changes now?
