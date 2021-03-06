import {Component, NgZone, OnDestroy} from '@angular/core';
import {ModalController, NavController} from 'ionic-angular';

import store from '../../app/store'
import currencyFormatter from 'currency-formatter'
import {SummaryModal} from "./summary-modal";
import moment from 'moment'

var budget = 100

var goal = 500

@Component({
  selector: 'page-summary',
  templateUrl: 'summary.html'
})
export class SummaryPage implements OnDestroy {
  ngOnDestroy(): void {
    store.setEventHandler(null)
  }

  budget = budget

  goal = goal

  transactions = null
  events = null

  constructor(public navCtrl: NavController, private zone: NgZone, public modalCtrl: ModalController) {
    this.transactions = store.getTransactions()
    this.events = store.getEvents()

    store.setEventHandler((transactions) => {
      this.zone.run(() => {
        if (this.transactions == null) {
          this.transactions = []

          transactions.forEach(transaction => {
            this.transactions.push(transaction)
          })

        } else {
          transactions.forEach(transaction => {
            this.transactions.push(transaction)
          })
        }
      })
    })

    store.setSummaryEventHandler((events) => {
      this.zone.run(() => {
        this.events = events
      })
    })
  }


  getSaved () {
    return (this.events || []).reduce((total, a) => {
      if (a.saved) {
        return a.saved + total
      }

      return total
    }, 0)
  }

  getLevel () {
    return this.getSaved() / 500
  }

  openModal(summary) {
    const referenceDate = moment(summary.date).startOf('day')
    const beginning = summary.type === 'daily' ? referenceDate.clone() : referenceDate.clone().subtract(6, 'days')
    const ending = referenceDate.clone().add(1, 'days')

    const filteredTransactions =
      (this.transactions || [])
        .filter(({date}) => {
          const d = moment(date)
          return d.valueOf() < ending.valueOf() && d.valueOf() >= beginning.valueOf()
        })

    const spend = filteredTransactions.reduce((sum, event) => sum + event.amount, 0)

    const profileModal = this.modalCtrl.create(SummaryModal, {
      id: summary.id,
      budget: this.getBudget(summary),
      saved: summary.saved,
      spend,
      type: summary.type,
      date: this.formatDate(summary)
    });
    profileModal.present();
  }

  formatDate(event) {
    if (event.type == 'daily') {
      return moment(event.date).format('dddd, MMM Do')
    }

    return 'Weekly Summary'
  }

  getBalance (event) {
    return this.prettyPrintCurrency(this.getBudget(event) - this.getSum(event))
  }

  isBalanceNegative (event) {
    return (this.getBudget(event) - this.getSum(event)) < 0
  }

  getBudget (event) {
    return event.type == 'weekly' ? budget * 20 : budget
  }

  getSum(event) {
    const referenceDate = moment(event.date).startOf('day')
    const beginning = event.type === 'daily' ? referenceDate.clone() : referenceDate.clone().subtract(6, 'days')
    const ending = referenceDate.clone().add(1, 'days')

    const filteredTransactions =
      (this.transactions || [])
        .filter(({date}) => {
          const d = moment(date)
          return d.valueOf() < ending.valueOf() && d.valueOf() >= beginning.valueOf()
        })

    return filteredTransactions.reduce((sum, event) => sum + event.amount, 0)
  }

  getIcon(event) {
    return !this.isBalanceNegative(event) ? '../assets/head_focus.png' : '../assets/head_hurt.png'
  }

  prettyPrintCurrency(amount, addSign = true) {
    var value = currencyFormatter.format(amount, {code: 'USD'})

    if (amount > 0 && addSign) {
      return "+" + value
    }

    return value
  }
}

