import { ApplicationConfig } from "@angular/core";
import { provideRouter } from "@angular/router";
import { provideHttpClient } from "@angular/common/http";
import { APP_INITIALIZER } from "@angular/core";
import { routes } from "./app.routes";
import { ModelService } from "./service/models.service";
import { provideMarkdown } from "ngx-markdown";
import { HttpClient } from "@angular/common/http";

export function initializeApp(modelService: ModelService): () => Promise<void> {
  return () => modelService.loadModels();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    provideMarkdown({
      loader: HttpClient,
    }),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [ModelService],
      multi: true,
    },
    ModelService,
  ],
};
