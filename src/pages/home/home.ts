import { Component, NgZone, OnDestroy } from '@angular/core';
import { NavController } from 'ionic-angular';
import store from '../../app/store';
import currencyFormatter from 'currency-formatter'
import { DomSanitizer } from '@angular/platform-browser';

import * as d3 from 'd3-selection';
import * as d3Scale from "d3-scale";
import * as d3Shape from "d3-shape";
import * as d3Array from "d3-array";
import * as d3Axis from "d3-axis";

@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage implements OnDestroy{
  ngOnDestroy(): void {
    store.setEventHandler(null)
  }

  title: string = 'D3.js with Ionic 2!';

  margin = {top: 20, right: 20, bottom: 30, left: 50};
  colors = ["#b8d0a6", "#d26f49", "#d5edf7", "#7e8787", "#b8824d"];

  width: number;
  height: number;
  radius: number;

  arc: any;
  labelArc: any;
  pie: any;
  color: any;
  svg: any;
  svg2: any;

  g: any;
  x: any;
  y: any;

  active_category: any;
  active_category_map: any;
  active_category_list: any;

  transactions: any;
  categories: any;
  map_categories: any;
  data: any;

  constructor(public navCtrl: NavController, private zone: NgZone, private _sanitizer: DomSanitizer) {
    this.width = 900 - this.margin.left - this.margin.right ;
    this.height = 500 - this.margin.top - this.margin.bottom;
    this.radius = Math.min(this.width, this.height) / 2;

    this.map_categories = {};
    this.transactions = store.getTransactions();

    store.setEventHandler((transactions) => {
      this.zone.run(() => {
        console.log("event", transactions.length);

        transactions.forEach(transaction => {
          this.transactions.push(transaction)
        });
      })
    });

    // I feel bad for this...
    this.transactions.forEach((transaction) => {
      const { amount, category } = transaction;
      this.map_categories[category] = (this.map_categories[category] || 0) + amount;
    });

    this.categories = [];
    for (const category in this.map_categories) {
      this.categories.push({ category: category, amount: this.map_categories[category] }) ;
    }
  }

  ionViewDidLoad() {
    this.initSvg();
    this.drawPie();
  }

  initSvg() {
    this.color = d3Scale.scaleOrdinal()
      .range(this.colors);
    this.arc = d3Shape.arc()
      .outerRadius(this.radius - 10)
      .innerRadius(this.radius - 125);
    this.labelArc = d3Shape.arc()
      .outerRadius(this.radius - 40)
      .innerRadius(this.radius - 40);
    this.pie = d3Shape.pie()(this.categories.map((d) => d.amount));

    this.svg = d3.select("#pieChart")
      .append("svg")
      .attr("width", '100%')
      .attr("height", '100%')
      .attr('viewBox','0 0 '+Math.min(this.width,this.height)+' '+Math.min(this.width,this.height))
      .append("g")
      .attr("transform", "translate(" + Math.min(this.width,this.height) / 2 + "," + Math.min(this.width,this.height) / 2 + ")");

    this.svg2 = d3.select("#barChart")
      .append("svg")
      .attr("width", '100%')
      .attr("height", '100%')
      .attr('viewBox','0 0 900 500');

    this.g = this.svg2.append("g")
      .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");
  }

  drawPie() {
    let g = this.svg.selectAll(".arc")
      .data(this.pie)
      .enter().append("g")
      .attr("class", "arc");

    g.append("path").attr("d", this.arc)
      .style("fill", (d: any, index) => this.color(index));
  }

  initAxis(category_list) {
    this.x = d3Scale.scaleLinear().rangeRound([this.width, 0]);
    this.y = d3Scale.scaleLinear().rangeRound([this.height, 0]);

    this.x.domain([0, d3Array.max(category_list, (d: any) => d.amount)]);
    this.y.domain([0, d3Array.max(category_list, (d, index) => index + 1)]);
  }

  drawAxis(category_list) {
    this.g.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", "translate(0," + this.height + ")")
      .call(d3Axis.axisBottom(this.x));

    this.g.append("g")
      .attr("class", "axis axis--y")
      .call(d3Axis.axisLeft(this.y)
        .ticks(category_list.length))
      .append("text")
      .attr("class", "axis-title")
      .attr("transform", "rotate(-90)")
      .attr("y", (d, index) => category_list.length)
      .attr("dy", "1em")
      .attr("text-anchor", "middle")
  }

  drawBars(category_list) {
    this.g.selectAll(".bar")
      .data(category_list)
      .enter().append("rect")
      .attr("class", "bar")
      .attr("x", (d) => this.x(d.amount) )
      .attr("y", (d, index) => this.y(index + 1))
      .attr("width", this.width)
      .attr("height", this.height);
  }

  prettyPrintAmount (category) {
    return currencyFormatter.format(this.map_categories[category], {code: 'USD'});
  }

  getColor (num) {
    return this._sanitizer.bypassSecurityTrustStyle(`-webkit-text-fill-color: ${this.colors[num]}`);
  }

  loadBarChart (category) {
    this.active_category = category;

    this.active_category_map = {};

    this.transactions.forEach((transaction) => {
      if (transaction.category === category) {
        let new_desc = transaction.desc.split(' ')
        new_desc = `${new_desc[0]} ${!/[\d|#].*/.test(new_desc[1]) ? new_desc[1] : ''}`.trim()

        this.active_category_map[new_desc] = (this.active_category_map[new_desc] || 0) + transaction.amount;
      }
    });

    this.active_category_list = [];

    for (const entry in this.active_category_map) {
      this.active_category_list.push({ name: entry, amount: this.active_category_map[entry]});
    }

    this.initAxis(this.active_category_list)
    this.drawBars(this.active_category_list)
    this.drawAxis(this.active_category_list)
  }
}
