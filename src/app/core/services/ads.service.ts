import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AdsService {

  private api = 'https://remote-desktop-landingpage-backend.onrender.com/api/ads';

  constructor(private http: HttpClient) {}

  getAds() {
    return this.http.get<any[]>(this.api);
  }
}
