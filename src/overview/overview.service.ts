import { Injectable } from '@nestjs/common';
import { Region } from '@prisma/client';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class OverviewService {
  constructor(private prisma: PrismaService) {}
  private calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return current === 0 ? 0 : 100;
    return Number((((current - previous) / previous) * 100).toFixed(1));
  }

  private getMonthRange(year: number, month: number) {
    return {
      start: new Date(year, month, 1),
      end: new Date(year, month + 1, 0, 23, 59, 59),
    };
  }

  async findOverview(month?: number, year?: number) {
    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetMonth = month ? month - 1 : now.getMonth();

    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

    const startOfLastMonth = new Date(targetYear, targetMonth - 1, 1);
    const endOfLastMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    const startOfThreeMonthsAgo = new Date(targetYear, targetMonth - 2, 1);

    const [
      currentMonthSales,
      lastMonthSales,
      currentActiveCustomers,
      lastMonthActiveCustomers,
      inventoryGroups,
      recentActivities,
      historicalOrders,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        _sum: { totalPrice: true },
        where: { createdAt: { gte: startOfMonth, lte: endOfMonth } },
      }),
      this.prisma.order.aggregate({
        _sum: { totalPrice: true },
        where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
      }),
      this.prisma.order.groupBy({
        by: ['customerId'],
        where: { createdAt: { gte: startOfMonth, lte: endOfMonth } },
      }),
      this.prisma.order.groupBy({
        by: ['customerId'],
        where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
      }),
      this.prisma.warehouseStock.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      this.prisma.activityLog.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.findMany({
        where: {
          createdAt: { gte: startOfThreeMonthsAgo, lte: endOfMonth },
        },
        select: { totalPrice: true, createdAt: true },
      }),
    ]);

    const totalSaleValue = currentMonthSales._sum.totalPrice || 0;
    const lastTotalSaleValue = lastMonthSales._sum.totalPrice || 0;
    const salesGrowth = this.calculateGrowth(
      totalSaleValue,
      lastTotalSaleValue,
    );

    const activeCustCount = currentActiveCustomers.length;
    const lastActiveCustCount = lastMonthActiveCustomers.length;
    const custGrowth = this.calculateGrowth(
      activeCustCount,
      lastActiveCustCount,
    );

    const inventoryStatus = { OK: 0, LOW: 0, OUT: 0 };
    inventoryGroups.forEach((group) => {
      if (group.status in inventoryStatus) {
        inventoryStatus[group.status] = group._count.status;
      }
    });

    const monthlyPerformanceMap = new Map<string, number>();

    for (let i = 2; i >= 0; i--) {
      const d = new Date(targetYear, targetMonth - i, 1);
      const monthName = d.toLocaleString('en-US', {
        month: 'short',
        year: 'numeric',
      });
      monthlyPerformanceMap.set(monthName, 0);
    }

    historicalOrders.forEach((order) => {
      const monthName = order.createdAt.toLocaleString('en-US', {
        month: 'short',
        year: 'numeric',
      });
      if (monthlyPerformanceMap.has(monthName)) {
        monthlyPerformanceMap.set(
          monthName,
          (monthlyPerformanceMap.get(monthName) ?? 0) + order.totalPrice,
        );
      }
    });

    const monthlyPerformance = Array.from(
      monthlyPerformanceMap,
      ([name, value]) => ({ name, value }),
    );

    const formattedActivities = recentActivities.map((activity) => {
      const { id, createdAt, ...rest } = activity;
      return {
        ...rest,
        timeAgo: formatDistanceToNow(new Date(createdAt), {
          addSuffix: true,
          locale: enUS,
        }),
      };
    });

    return {
      totalSale: {
        value: totalSaleValue,
        change: salesGrowth,
      },
      activeCustomers: {
        value: activeCustCount,
        change: custGrowth,
      },
      inventoryStatus: inventoryStatus,
      recentActivity: formattedActivities,
      monthlyPerformance: monthlyPerformance,
    };
  }

  async getInsights() {
    const now = new Date();
    const currentMonth = this.getMonthRange(now.getFullYear(), now.getMonth());
    const lastMonth = this.getMonthRange(now.getFullYear(), now.getMonth() - 1);

    const topProductsRaw = await this.prisma.order.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      where: { createdAt: { gte: currentMonth.start, lte: currentMonth.end } },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 2,
    });

    let totalCurrentQty = 0;
    let totalLastMonthQty = 0;

    const topProducts = await Promise.all(
      topProductsRaw.map(async (item) => {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
        });

        const lastMonthStats = await this.prisma.order.aggregate({
          _sum: { quantity: true },
          where: {
            productId: item.productId,
            createdAt: { gte: lastMonth.start, lte: lastMonth.end },
          },
        });

        const currentQty = item._sum.quantity || 0;
        const lastQty = lastMonthStats._sum.quantity || 0;

        totalCurrentQty += currentQty;
        totalLastMonthQty += lastQty;

        return {
          name: product?.name || 'Unknown Product',
          amount: currentQty,
          growth: this.calculateGrowth(currentQty, lastQty),
        };
      }),
    );

    const overallGrowth = this.calculateGrowth(
      totalCurrentQty,
      totalLastMonthQty,
    );

    const topProductGrowth = {
      items: topProducts,
      totalGrowth: overallGrowth,
    };

    const last4WeeksFunnel = await this.prisma.funnelWeekly.findMany({
      orderBy: { weekStart: 'desc' },
      take: 4,
    });

    const sortedFunnel = last4WeeksFunnel.reverse();

    const weeklyChurnData = sortedFunnel.map((item, index) => {
      const cart = item.addToCart || 0;
      const bought = item.purchases || 0;

      if (cart === 0) return { name: `Week ${index + 1}`, value: 0 };

      const abandonmentRate = ((cart - bought) / cart) * 100;

      return {
        name: `Week ${index + 1}`,
        value: Math.round(abandonmentRate),
      };
    });

    const maxChurnWeek = weeklyChurnData.reduce(
      (prev, current) => (prev.value > current.value ? prev : current),
      { name: '-', value: 0 },
    );

    const churnRate = {
      weekly: weeklyChurnData,
      summary: `${maxChurnWeek.name} saw the highest drop-off rate (${maxChurnWeek.value}%).`,
    };

    let globalCurrentSales = 0;
    let globalLastMonthSales = 0;

    const regionNames: Record<Region, string> = {
      [Region.NA]: 'North America',
      [Region.EU]: 'Europe',
      [Region.APAC]: 'Asia Pacific',
    };

    const regionalData = await Promise.all(
      Object.values(Region).map(async (region) => {
        const currentSales = await this.prisma.order.aggregate({
          _sum: { totalPrice: true },
          where: {
            createdAt: { gte: currentMonth.start, lte: currentMonth.end },
            customer: { region: region },
          },
        });

        const lastSales = await this.prisma.order.aggregate({
          _sum: { totalPrice: true },
          where: {
            createdAt: { gte: lastMonth.start, lte: lastMonth.end },
            customer: { region: region },
          },
        });

        const currentVal = currentSales._sum.totalPrice || 0;
        const lastVal = lastSales._sum.totalPrice || 0;
        globalCurrentSales += currentVal;
        globalLastMonthSales += lastVal;

        return {
          regionCode: region,
          name: regionNames[region],
          value: Math.round(currentVal),
          growth: this.calculateGrowth(currentVal, lastVal),
        };
      }),
    );

    const overallRegionGrowth = this.calculateGrowth(
      globalCurrentSales,
      globalLastMonthSales,
    );

    const bestRegion = [...regionalData].sort((a, b) => b.growth - a.growth)[0];

    const summaryTextRegion = bestRegion
      ? `${bestRegion.name} showing strongest growth this quarter.`
      : 'No sales data available for regional comparison.';

    const regional = {
      data: regionalData.map((item) => ({
        name: item.name,
        value: item.value,
        growth: item.growth,
      })),
      summary: summaryTextRegion,
      totalGrowth: overallRegionGrowth,
      totalSales: Math.round(globalCurrentSales),
    };

const currentFunnelStats = await this.prisma.funnelWeekly.aggregate({
      _sum: {
        visitors: true,
        productViews: true,
        addToCart: true,
        purchases: true,
      },
      where: {
        weekStart: { gte: currentMonth.start, lte: currentMonth.end },
      },
    });

    const lastFunnelStats = await this.prisma.funnelWeekly.aggregate({
      _sum: {
        visitors: true,
        purchases: true, 
        addToCart: true, 
      },
      where: {
        weekStart: { gte: lastMonth.start, lte: lastMonth.end },
      },
    });

    const visitors = currentFunnelStats._sum.visitors || 0;
    const views = currentFunnelStats._sum.productViews || 0;
    const addToCart = currentFunnelStats._sum.addToCart || 0;
    const purchases = currentFunnelStats._sum.purchases || 0;
    const currentConv = visitors > 0 ? (purchases / visitors) * 100 : 0;

    const lastVisitors = lastFunnelStats._sum.visitors || 0;
    const lastPurchases = lastFunnelStats._sum.purchases || 0;
    const lastAddToCart = lastFunnelStats._sum.addToCart || 0;
    const lastConv = lastVisitors > 0 ? (lastPurchases / lastVisitors) * 100 : 0;

    const overallConversionGrowth = this.calculateGrowth(currentConv, lastConv);

    const currentCartToPurchaseRate = addToCart > 0 ? (purchases / addToCart) * 100 : 0;
    const lastCartToPurchaseRate = lastAddToCart > 0 ? (lastPurchases / lastAddToCart) * 100 : 0;

    const diff = currentCartToPurchaseRate - lastCartToPurchaseRate;
    const absDiff = Math.abs(diff).toFixed(1); 
    const direction = diff >= 0 ? 'increased' : 'decreased';

    const summaryTextFunnel = lastAddToCart > 0 
      ? `Checkout to purchase conversion ${direction} by ${absDiff}%`
      : `Current checkout to purchase conversion is ${currentCartToPurchaseRate.toFixed(1)}%`;

    const funnel = {
      data: [
        { step: 'VISITORS', value: visitors },
        { step: 'PRODUCT VIEWS', value: views },
        { step: 'ADD TO CART', value: addToCart },
        { step: 'PURCHASE', value: purchases },
      ],
      totalGrowth: overallConversionGrowth,
      summary: summaryTextFunnel,
    };

    return {
      topProductGrowth,
      churnRate,
      regional,
      funnel,
    };
  }
}
