import { TextDocument } from 'vscode';
export interface ProjectLocations {
    [projectName: string]: {
        position: number;
        targets?: ProjectTargetLocation;
        projectPath?: string;
    };
}
export interface ProjectTargetLocation {
    [target: string]: {
        position: number;
        configurations?: ProjectTargetLocation;
    };
}
export declare function getProjectLocations(document: TextDocument, projectName?: string): ProjectLocations;
