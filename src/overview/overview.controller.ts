import { Controller, Get, UseGuards } from '@nestjs/common';
import { OverviewService } from './overview.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('overview')
export class OverviewController {
  constructor(private readonly overviewService: OverviewService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get()
  findOverview(month?: number, year?: number) {
    return this.overviewService.findOverview(month, year);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('insights')
  findInsights() {
    return this.overviewService.getInsights()
  }
}
