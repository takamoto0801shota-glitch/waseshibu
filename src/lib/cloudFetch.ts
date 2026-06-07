import { fetchUserDataFromApi } from "@/lib/userDataClient";
import { CloudAppState } from "@/lib/types";

/** クラウド読込を数回リトライ（ログイン直後の遅延対策） */
export async function fetchCloudWithRetry(
  maxAttempts = 3,
  delayMs = 400
): Promise<CloudAppState | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const cloud = await fetchUserDataFromApi();
      if (cloud) return cloud;
    } catch {
      /* 次の試行へ */
    }
    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  }
  return null;
}
