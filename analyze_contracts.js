// Analysis of Contract Billing Periods from MX Merchant API
// Based on actual data fetched from API

const sampleData = {
  "interval": {
    "Weekly": {
      "1 Week": ["Benjamin Jensen", "Kal Elsayed", "Steven Marcelino", "James Parker", "Emmanuel Cavalcantee"],
      "4 Weeks": ["Ryan Gerczak", "Nasser Alnaemi", "Matthew Dalverny", "Ron Stevens", "Andrew Stout", "Dawit Mekonen"],
      "10 Weeks": ["Thomas Goolsby"]
    },
    "Once": {
      "Once": ["Ryan Gerczak (Completed)", "Eric Turnbaugh", "German Peri", "Ron Stevens", "Andrew Stout"]
    }
  }
};

console.log("=".repeat(80));
console.log("CONTRACT BILLING PERIOD ANALYSIS");
console.log("=".repeat(80));

console.log("\n📊 DISCOVERED BILLING PERIODS:\n");

console.log("1️⃣  WEEKLY INTERVALS:");
console.log("   ├─ 1 Week    (charges every week)");
console.log("   ├─ 4 Weeks   (charges every 4 weeks = ~monthly)");
console.log("   └─ 10 Weeks  (charges every 10 weeks = ~2.5 months)");

console.log("\n2️⃣  ONE-TIME:");
console.log("   └─ Once      (single charge, status becomes 'Completed')");

console.log("\n" + "=".repeat(80));
console.log("PROJECTION CALCULATION FORMULAS");
console.log("=".repeat(80));

console.log("\n💰 MONTHLY RECURRING REVENUE (MRR) CALCULATION:\n");

console.log("function calculateMRR(contract) {");
console.log("  const { interval, every, amount, status } = contract;");
console.log("");
console.log("  // Only Active contracts contribute to MRR");
console.log("  if (status !== 'Active') return 0;");
console.log("");
console.log("  // One-time contracts don't contribute to recurring revenue");
console.log("  if (interval === 'Once') return 0;");
console.log("");
console.log("  // Weekly subscriptions");
console.log("  if (interval === 'Weekly') {");
console.log("    const weeks = parseInt(every.split(' ')[0]); // '4 Weeks' → 4");
console.log("    const paymentsPerMonth = 4.33 / weeks; // Average 4.33 weeks/month");
console.log("    return amount * paymentsPerMonth;");
console.log("  }");
console.log("");
console.log("  return 0;");
console.log("}");

console.log("\n📈 EXAMPLES:\n");

const examples = [
  { interval: "Weekly", every: "1 Week", amount: 249, status: "Active" },
  { interval: "Weekly", every: "4 Weeks", amount: 249, status: "Active" },
  { interval: "Weekly", every: "10 Weeks", amount: 162, status: "Active" },
  { interval: "Once", every: "Once", amount: 750, status: "Completed" }
];

examples.forEach((contract, i) => {
  const weeks = contract.interval === 'Weekly' ? parseInt(contract.every.split(' ')[0]) : 0;
  const paymentsPerMonth = weeks > 0 ? 4.33 / weeks : 0;
  const mrr = contract.status === 'Active' && contract.interval !== 'Once'
    ? contract.amount * paymentsPerMonth
    : 0;

  console.log(`${i + 1}. ${contract.interval} - ${contract.every} - $${contract.amount} (${contract.status})`);
  if (weeks > 0) {
    console.log(`   Payments/Month: 4.33 / ${weeks} = ${paymentsPerMonth.toFixed(2)}`);
    console.log(`   MRR: $${contract.amount} × ${paymentsPerMonth.toFixed(2)} = $${mrr.toFixed(2)}`);
  } else {
    console.log(`   MRR: $${mrr.toFixed(2)} (${contract.interval === 'Once' ? 'One-time, not recurring' : 'Not active'})`);
  }
  console.log("");
});

console.log("=".repeat(80));
console.log("PROJECTION LOGIC FOR SELECTED DATE RANGE");
console.log("=".repeat(80));

console.log("\n🎯 UPCOMING PAYMENTS CALCULATION:\n");

console.log("function getUpcomingPayments(contracts, startDate, endDate) {");
console.log("  return contracts");
console.log("    .filter(c => c.status === 'Active')");
console.log("    .filter(c => {");
console.log("      const nextBill = new Date(c.nextBillDate);");
console.log("      return nextBill >= startDate && nextBill <= endDate;");
console.log("    })");
console.log("    .reduce((sum, c) => sum + parseFloat(c.amount), 0);");
console.log("}");

console.log("\n📅 KEY INSIGHTS:\n");
console.log("✅ Use 'nextBillDate' field for accurate projection");
console.log("✅ Filter by date range in database query");
console.log("✅ Only count 'Active' status contracts");
console.log("✅ 'Completed' and 'Inactive' should be excluded");
console.log("✅ 'Once' contracts with 'Active' status may have future billing");

console.log("\n" + "=".repeat(80));
console.log("DATABASE QUERY EXAMPLES");
console.log("=".repeat(80));

console.log("\n-- Get projected revenue for next 30 days");
console.log("SELECT");
console.log("  DATE(next_bill_date) as billing_date,");
console.log("  COUNT(*) as payment_count,");
console.log("  SUM(amount) as daily_revenue,");
console.log("  JSON_AGG(customer_name) as customers");
console.log("FROM contracts");
console.log("WHERE status = 'Active'");
console.log("  AND next_bill_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'");
console.log("GROUP BY DATE(next_bill_date)");
console.log("ORDER BY billing_date ASC;");

console.log("\n-- Get total MRR (all active recurring contracts)");
console.log("SELECT");
console.log("  SUM(CASE");
console.log("    WHEN billing_interval = 'Weekly' AND billing_frequency = '1 Week'");
console.log("      THEN amount * 4.33");
console.log("    WHEN billing_interval = 'Weekly' AND billing_frequency = '4 Weeks'");
console.log("      THEN amount * 1.08");
console.log("    WHEN billing_interval = 'Weekly' AND billing_frequency = '10 Weeks'");
console.log("      THEN amount * 0.43");
console.log("    ELSE 0");
console.log("  END) as monthly_recurring_revenue");
console.log("FROM contracts");
console.log("WHERE status = 'Active'");
console.log("  AND billing_interval != 'Once';");

console.log("\n" + "=".repeat(80));
