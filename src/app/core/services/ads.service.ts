import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AdsService {

  private api = 'http://localhost:5000/api/ads';

  constructor(private http: HttpClient) {}

  getAds() {
    return this.http.get<any[]>(this.api);
  }
}
