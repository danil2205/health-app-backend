
export class GetHealthDataResponseDto {
	recordTime: Date;
	avgHeartRate: number;
	avgBloodOxygen: number;
	avgCalories: number;
	avgDistance: number;
	avgFatBurning: number;
	avgPai: number;
	avgSleepScore: number;
	avgSleepTotalTime: number;
	sleepingStatus: string;
	totalSteps: number;
	avgStress: number;
	wearStatus: string;
}