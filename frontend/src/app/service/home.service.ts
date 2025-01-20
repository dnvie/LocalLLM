import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { Models } from "../data/models";

const baseUrl = "http://localhost:80";

@Injectable({
  providedIn: "root",
})
export class HomeService {
  constructor(private http: HttpClient) {}

  getModels(): Observable<Models> {
    return this.http.get<Models>(`${baseUrl}/models`);
  }
}
