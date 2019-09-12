import React from "react"
import { connect } from "react-redux"
import { Exchange } from "../../containers/Exchange"
import { Transfer } from "../../containers/Transfer"
import { LimitOrder, LimitOrderAccount, withSourceAndBalance } from "../../containers/LimitOrder"
import { ExchangeHistory } from "../../containers/CommonElements/"
import constanst from "../../services/constants"
import history from "../../history"
import { clearSession, changeLanguage, setOnMobileOnly, initAnalytics, switchTheme } from "../../actions/globalActions"
import { openInfoModal } from "../../actions/utilActions"
import { createNewConnectionInstance } from "../../actions/connectionActions"
import { throttle } from 'underscore';
import { LayoutView } from "../../components/Layout"
import { getTranslate } from 'react-localize-redux'
import * as common from "../../utils/common"
import {isMobile} from '../../utils/common'
import Language from "../../../../lang"
import AnalyticFactory from "../../services/analytics"
import BLOCKCHAIN_INFO from "../../../../env";

@connect((store) => {
  var locale = store.locale
  var code
  if(Array.isArray(locale.languages)) {
    code = locale.languages[0].code
  }

  var langClass
  switch(code) {
    case "en":
      langClass = "swap-en"
      break
    case "cn":
      langClass = "swap-cn"
      break
    case "kr":
      langClass = "swap-kr"
      break
    case "ru":
      langClass = "swap-ru"
      break
    case "vi":
      langClass = "swap-vi"
      break
    default:
      langClass = ""
  }

  return {
    ethereumNode: store.connection.ethereum,
    currentBlock: store.global.currentBlock,
    connected: store.global.connected,
    showBalance: store.global.showBalance,
    utils: store.utils,
    account: store.account,
    translate: getTranslate(store.locale),
    locale: locale,
    tokens: store.tokens.tokens,
    analytics: store.global.analytics,
    langClass: langClass,
    theme: store.global.theme
  }
})

export default class Layout extends React.Component {
  constructor() {
    super();
    this.idleTime = 0;
    this.timeoutEndSession = constanst.IDLE_TIME_OUT / 10;    // x10 seconds
    this.idleMode = false;
    this.intervalIdle = null;
    this.LimitOrderAccount = withSourceAndBalance(<LimitOrderAccount />)
  }

  componentWillMount() {
    document.onload = this.resetTimmer;
    document.onmousemove = this.resetTimmer;
    document.onmousedown = this.resetTimmer; // touchscreen presses
    document.ontouchstart = this.resetTimmer;
    document.onclick = this.resetTimmer;     // touchpad clicks
    document.onscroll = this.resetTimmer;    // scrolling with arrow keys
    document.onkeypress = this.resetTimmer;

    this.intervalIdle = setInterval(this.checkTimmer.bind(this), 10000)
    this.props.dispatch(createNewConnectionInstance())

    const analytic = new AnalyticFactory({ listWorker: ['mix'], network: BLOCKCHAIN_INFO.chainName })
    this.props.dispatch(initAnalytics(analytic))
  }

  componentDidMount = () => {
    this.props.analytics.callTrack("trackAccessToSwap");

    window.addEventListener("beforeunload", this.handleCloseWeb)
    if (isMobile.iOS() || isMobile.Android()) {
      this.props.dispatch(setOnMobileOnly())
    }

    if (window.kyberBus) {
      window.kyberBus.on("swap.switch_theme", this.switchTheme.bind(this));
    }
  }

  switchTheme = () => {
    const theme = this.props.theme === 'dark' ? 'light' : 'dark';
    this.props.dispatch(switchTheme(theme));
  }

  handleCloseWeb = () => {
    this.props.analytics.callTrack("exitSwap");
  }

  checkTimmer() {
    if (!this.props.account.account) return;
    if (this.props.utils.infoModal && this.props.utils.infoModal.open) return;
    if (this.idleTime >= this.timeoutEndSession) {
      let timeOut = constanst.IDLE_TIME_OUT/60
      let titleModal = this.props.translate('error.time_out') || 'Time out'
      let contentModal = this.props.translate('error.clear_data_timeout', {time: timeOut}) || `We've cleared all your data because your session is timed out ${timeOut} minutes`
      this.props.dispatch(openInfoModal(titleModal, contentModal));
      this.endSession();
    } else {
      this.idleTime++;
    }
  }

  resetTimmer = throttle(this.doResetTimer.bind(this), 5000)

  doResetTimer() {
    this.idleTime = 0;
  }

  endSession() {
    this.props.dispatch(clearSession());
  }

  setActiveLanguage = (language) => {
    this.props.dispatch(changeLanguage(this.props.ethereumNode, language, this.props.locale))
  }

  render() {
    var currentLanguage = common.getActiveLanguage(this.props.locale.languages)
    const LimitOrderAccount = this.LimitOrderAccount
    return (
      <div>
        <LayoutView
          history={history}        
          Exchange={Exchange}
          Transfer={Transfer}
          LimitOrder = {LimitOrder}
          supportedLanguages={Language.supportLanguage}
          setActiveLanguage={this.setActiveLanguage}      
          currentLanguage = {currentLanguage}  
          tokens = {this.props.tokens}
          langClass = {this.props.langClass}
          theme = {this.props.theme}
        />
        <section id="right-nav" className={`${this.props.langClass} theme theme--${this.props.theme}`}>
          <LimitOrderAccount />
        </section>
      </div>
    )
  }
}
