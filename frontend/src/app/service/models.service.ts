import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject } from "rxjs";
import { Model, Models } from "../data/models";

const baseUrl = "http://localhost:80";

@Injectable({
  providedIn: "root",
})
export class ModelService {
  private modelsSubject = new BehaviorSubject<Models | null>(null);
  models$ = this.modelsSubject.asObservable();

  private selectedModelSubject = new BehaviorSubject<Model | null>(null);
  selectedModel$ = this.selectedModelSubject.asObservable();

  constructor(private http: HttpClient) {}

  loadModels(): Promise<void> {
    if (this.modelsSubject.value) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.http.get<Models>(`${baseUrl}/models`).subscribe({
        next: (data) => {
          this.modelsSubject.next(data);

          const selectedModel = data.models.find(
            (model) => model.name_trimmed === "mistral-nemo",
          );
          if (selectedModel) {
            this.setSelectedModel(selectedModel);
          } else {
            this.setSelectedModel(data.models[10] || data.models[0]);
          }

          resolve();
        },
        error: (err) => {
          console.error("Error loading models:", err);
          reject(err);
        },
      });
    });
  }

  getModels(): Models | null {
    return this.modelsSubject.value;
  }

  refreshModels(): Promise<void> {
    this.modelsSubject.next(null);
    return this.loadModels();
  }

  getSelectedModel(): Model | null {
    return this.selectedModelSubject.value;
  }

  setSelectedModel(model: Model): void {
    this.selectedModelSubject.next(model);
  }
}
