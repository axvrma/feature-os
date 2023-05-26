import { PackageModel } from "src/app/application/sdk";

export interface SettingsModel extends PackageModel<SettingsChildrenModel> { }

export interface SettingsChildrenModel {
  title?: string,
  icon?: string,
  children?: SettingsChildrenModel[],
}
