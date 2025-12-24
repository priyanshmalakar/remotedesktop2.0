import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AdsService {

  private readonly api =
    'https://remote-desktop-landingpage-backend.onrender.com/api/ads';

  // 🔒 Cached observable (single API call)
  private ads$?: Observable<any[]>;

  constructor(private http: HttpClient) {}

  /**
   * Get Ads (CACHED)
   * ✅ API called only once
   * ✅ Prevents multiple subscriptions
   * ✅ Avoids Electron / Web hang
   */
  getAds(): Observable<any[]> {
    if (!this.ads$) {
      this.ads$ = this.http.get<any[]>(this.api).pipe(
        shareReplay(1),
        tap({
          error: () => {
            // reset cache if API fails
            this.ads$ = undefined;
          },
        })
      );
    }
    return this.ads$;
  }

  /**
   * Force reload ads (optional)
   */
  refreshAds(): Observable<any[]> {
    this.ads$ = undefined;
    return this.getAds();
  }
}
