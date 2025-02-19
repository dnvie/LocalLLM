import { Component, OnInit, ElementRef, HostListener } from "@angular/core";
import { ModelService } from "../../service/models.service";
import { Model, Models } from "../../data/models";

@Component({
  selector: "app-model-selector",
  standalone: true,
  imports: [],
  templateUrl: "./model-selector.component.html",
  styleUrl: "./model-selector.component.scss",
})
export class ModelSelectorComponent implements OnInit {
  models: Models | null = null;
  groupedModelsMap: { [key: string]: Model[] } = {};
  groupedModels: Model[][] = [];
  selectedModel: Model | null = null;
  isListExpanded: boolean = false;

  constructor(
    private modelService: ModelService,
    private el: ElementRef,
  ) {}

  toggleModelSelector() {
    document.getElementById("modelDropdown")!.classList.toggle("inactive");
    document.getElementById("downCaret")!.classList.toggle("rotate");
    this.isListExpanded = !this.isListExpanded;
  }

  expand(index: number) {
    document.getElementById("innerModels"+index)!.classList.toggle("active");
    document.getElementById("modelCategory"+index)!.classList.toggle("active");
    document.getElementById("caret"+index)!.classList.toggle("active");
  }

  collapseAll() {
    const innerModels = document.getElementsByClassName("innerModels");
    const modelCategories = document.getElementsByClassName("modelCategory");
    const carets = document.getElementsByClassName("caret");

    for (let i = 0; i < innerModels.length; i++) {
      innerModels[i].classList.remove("active");
      modelCategories[i].classList.remove("active");
      carets[i].classList.remove("active");
    }
  }

  setModel(model: Model) {
    this.modelService.setSelectedModel(model);
    localStorage.setItem("selectedModel", JSON.stringify(model));
    this.toggleModelSelector();
  }

  ngOnInit(): void {
    const savedModel = localStorage.getItem("selectedModel");
    if (savedModel) {
      this.selectedModel = JSON.parse(savedModel);
      this.modelService.setSelectedModel(this.selectedModel!);
    }

    this.modelService.models$.subscribe((models) => {
      this.models = models;
      this.groupedModels = this.groupModels();
      console.log(this.groupedModels);
    });

    this.modelService.selectedModel$.subscribe((model) => {
      this.selectedModel = model;
    });
  }

  groupModels(): Model[][] {
    this.models?.models.forEach((model) => {
      const trimmedName = model.name_trimmed;
      if (!this.groupedModelsMap[trimmedName]) {
      this.groupedModelsMap[trimmedName] = [];
      }
    this.groupedModelsMap[trimmedName].push(model);
    })

    Object.keys(this.groupedModelsMap).forEach((key) => {
      this.groupedModelsMap[key].sort((a, b) => {
        const paramA = parseFloat(a.details.parameter_size) || 0;
        const paramB = parseFloat(b.details.parameter_size) || 0;
        return paramA - paramB;
      });
    });
    return Object.values(this.groupedModelsMap);
  }

  @HostListener("document:click", ["$event"])
  onClickOutside(event: MouseEvent): void {
    const dropdown = this.el.nativeElement.querySelector("#modelDropdown");
    const currentModel = this.el.nativeElement.querySelector(".currentModel");

    if (
      dropdown &&
      currentModel &&
      !dropdown.contains(event.target) &&
      !currentModel.contains(event.target)
    ) {
      document.getElementById("downCaret")!.classList.remove("rotate");
      dropdown.classList.add("inactive");
      this.collapseAll();
    }
  }
}
