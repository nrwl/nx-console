import {
  Component,
  ElementRef,
  Input,
  NgZone,
  OnInit,
  ViewChild
} from '@angular/core';
import { select, selectAll } from 'd3-selection';
import { arc } from 'd3-shape';
import { hierarchy, partition } from 'd3-hierarchy';
import 'd3-transition';
import { FormatFileSizePipe } from '../format-file-size.pipe';

interface Chunk {
  id: string;
  name: undefined | string;
  path: string;
  file: string;
}

// Mapping of step names to colors.
const Colors: any = {
  apps: '#d15d89',
  libs: '#e4bb43',
  src: '#4663d1',
  node_modules: '#51d140',
  other: '#8e8e8e'
};

const INACTIVE_OPACITY = 0.5;
const ACTIVE_OPACITY = 1;

const MIN_WIDTH = 400;
const MIN_HEIGHT = 400;

@Component({
  selector: 'ui-modules-graph',
  templateUrl: './modules-graph.component.html',
  styleUrls: ['./modules-graph.component.scss']
})
export class ModulesGraphComponent implements OnInit {
  svg: any;
  g: any;
  x: any;
  y: any;
  _data: any;

  @Input() chunk: Chunk;

  @Input()
  set data(data: any) {
    this._data = data;
    this.updateHierarchy();
    this.render();
  }

  @ViewChild('svg') private readonly svgEl: ElementRef | null = null;
  @ViewChild('container') private readonly container: ElementRef | null = null;

  private width = MIN_WIDTH;
  private height = MIN_HEIGHT;
  private vis: any;
  private hierarchicalData: object | null = null;
  private totalSize: number;
  private percentageEl: Element;
  private fileSizeEl: Element;
  private moduleNameEl: Element;

  constructor(
    private readonly formatFileSize: FormatFileSizePipe,
    private readonly zone: NgZone
  ) {}

  ngOnInit() {
    this.updateDimensions();
  }

  updateDimensions() {
    if (!this.container) {
      return;
    }
    this.width = this.container.nativeElement.offsetWidth;
    this.height = this.container.nativeElement.offsetHeight;
  }

  render() {
    this.zone.runOutsideAngular(() => {
      if (!this.hierarchicalData) {
        return;
      }

      this.reset();
      this.createVisualization(this.hierarchicalData);
      this.showDefaultExplanation();
    });
  }

  reset() {
    const svgEl = this.svgEl;
    if (!svgEl) {
      return;
    }

    this.svg = select(svgEl.nativeElement);
    this.svg.select('.modules').remove();
  }

  showDefaultExplanation() {
    select(this.fileSizeEl).text(this.formatFileSize.transform(this.totalSize));
    select(this.percentageEl).text('100%');
    select(this.moduleNameEl).text(this.chunk.name || this.chunk.file);
  }

  createVisualization(json: object) {
    if (!this.container || !this.svgEl) {
      return;
    }

    const radius = Math.min(this.width, this.height) / 2;

    this.vis = select(this.svgEl.nativeElement)
      .attr('width', this.width)
      .attr('height', this.height)
      .append('svg:g')
      .attr('class', 'modules')
      .attr('transform', `translate(${this.width / 2}, ${this.height / 2})`);

    this.percentageEl = this.container.nativeElement.querySelector(
      '.percentage'
    );
    this.fileSizeEl = this.container.nativeElement.querySelector('.file-size');
    this.moduleNameEl = this.container.nativeElement.querySelector(
      '.module-name'
    );

    const levelPartition = partition().size([2 * Math.PI, radius * radius]);

    const moduleArc = arc()
      .startAngle((d: any) => d.x0)
      .endAngle((d: any) => d.x1)
      .innerRadius((d: any) => Math.sqrt(d.y0))
      .outerRadius((d: any) => Math.sqrt(d.y1));

    // Bounding circle underneath the sunburst, to make it easier to detect
    // when the mouse leaves the parent g.
    this.vis
      .append('svg:circle')
      .attr('r', radius)
      .style('opacity', 0);

    // Turn the data into a d3 hierarchy and calculate the sums.
    const root = hierarchy(json)
      .sum((d: any) => d.size)
      .sort((a: any, c: any) => c.value - a.value);

    const nodes = levelPartition(root).descendants();

    const path = this.vis
      .data([json])
      .selectAll('path')
      .data(nodes)
      .enter()
      .append('svg:path')
      .attr('display', (d: any) => (d.depth ? null : 'none'))
      .attr('d', moduleArc as any)
      .style('fill', (d: any) =>
        Colors[d.data.initialSegment]
          ? Colors[d.data.initialSegment]
          : Colors.other
      )
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .style('opacity', INACTIVE_OPACITY)
      .on('mouseover', this.handleMouseover)
      .on('mouseleave', this.handleMouseleave);

    // Get total size of the tree = value of root node from partition.
    this.totalSize = path.datum().value;
  }

  updateHierarchy() {
    if (!this._data) {
      return null;
    }

    const root = {
      name: 'root',
      children: [],
      initialSegment: 'other'
    };
    for (let i = 0; i < this._data.length; i++) {
      const sequence = this._data[i][0];
      const size = +this._data[i][1];
      if (isNaN(size)) {
        // e.g. if this is a header row
        continue;
      }
      const parts = sequence.split(/[/\\]/);
      let currentNode = root;
      const initialSegment = parts[0];

      for (let j = 0; j < parts.length; j++) {
        const children: any[] = currentNode.children;
        const nodeName = parts[j];
        let childNode;
        if (j + 1 < parts.length) {
          // Not yet at the end of the sequence; move down the tree.
          let foundChild = false;
          for (let k = 0; k < children.length; k++) {
            if (children[k].name === nodeName) {
              childNode = children[k];
              foundChild = true;
              break;
            }
          }
          // If we don't already have a child node for this branch, create it.
          if (!foundChild) {
            childNode = { name: nodeName, children: [], initialSegment };
            children.push(childNode);
          }
          currentNode = childNode;
        } else {
          // Reached the end of the sequence; create a leaf node.
          childNode = { name: nodeName, size, initialSegment };
          children.push(childNode);
        }
      }
    }

    this.hierarchicalData = root;
  }

  handleResize() {
    this.updateDimensions();
    this.render();
  }

  handleMouseover = (d: any) => {
    const fileSize = this.formatFileSize.transform(d.value);
    const percentage = ((100 * d.value) / this.totalSize).toPrecision(3);
    let percentageString = percentage + '%';
    if (Number(percentage) < 0.1) {
      percentageString = '< 0.1%';
    }

    select(this.fileSizeEl).text(fileSize);
    select(this.percentageEl).text(percentageString);
    select(this.moduleNameEl).text(d.data.name);

    const sequenceArray = d.ancestors().reverse();
    sequenceArray.shift(); // remove root node from the array

    selectAll('path').style('opacity', INACTIVE_OPACITY);
    this.vis
      .selectAll('path')
      .filter((node: any) => sequenceArray.indexOf(node) >= 0)
      .style('opacity', ACTIVE_OPACITY);
  };

  handleMouseleave = () => {
    selectAll('path').on('handleMouseover', null);

    selectAll('path')
      .style('opacity', INACTIVE_OPACITY)
      .on('handleMouseover', this.handleMouseover);

    this.showDefaultExplanation();
  };
}
