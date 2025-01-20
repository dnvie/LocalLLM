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
    });

    this.modelService.selectedModel$.subscribe((model) => {
      this.selectedModel = model;
    });
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
      dropdown.classList.add("inactive");
    }
  }
}
