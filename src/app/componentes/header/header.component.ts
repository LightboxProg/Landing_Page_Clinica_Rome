import { Component, AfterViewInit } from '@angular/core';

declare var jQuery: any;
declare var revslider_showDoubleJqueryError: any;

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements AfterViewInit {

  ngAfterViewInit(): void {
    const tpj = jQuery;
    let revapi1;

    // Inicialización del Slider Revolution
    if (tpj("#rev_slider_1_2").revolution == undefined) {
      revslider_showDoubleJqueryError("#rev_slider_1_2");
    } else {
      revapi1 = tpj("#rev_slider_1_2").show().revolution({
        dottedOverlay: "none",
        delay: 90000,
        startwidth: 1180,
        startheight: 750,
        hideThumbs: 200,
        thumbWidth: 100,
        thumbHeight: 50,
        thumbAmount: 1,
        simplifyAll: "off",
        navigationType: "none",
        navigationArrows: "none",
        navigationStyle: "round",
        touchenabled: "off",
        onHoverStop: "on",
        nextSlideOnWindowFocus: "off",
        keyboardNavigation: "off",
        navigationHAlign: "center",
        navigationVAlign: "bottom",
        navigationHOffset: 0,
        navigationVOffset: 20,
        soloArrowLeftHalign: "left",
        soloArrowLeftValign: "center",
        soloArrowLeftHOffset: 20,
        soloArrowLeftVOffset: 0,
        soloArrowRightHalign: "right",
        soloArrowRightValign: "center",
        soloArrowRightHOffset: 20,
        soloArrowRightVOffset: 0,
        shadow: 0,
        fullWidth: "on",
        fullScreen: "off",
        spinner: "spinner3",
        stopLoop: "on",
        stopAfterLoops: 0,
        stopAtSlide: 1,
        shuffle: "off",
        autoHeight: "off",
        forceFullWidth: "off",
        hideTimerBar: "on",
        hideThumbsOnMobile: "off",
        hideNavDelayOnMobile: 1500,
        hideBulletsOnMobile: "off",
        hideArrowsOnMobile: "off",
        hideThumbsUnderResolution: 0,
        hideSliderAtLimit: 0,
        hideCaptionAtLimit: 0,
        hideAllCaptionAtLilmit: 0,
        startWithSlide: 0,
      });
    }

    // Inicialización del Logo Retina
    const retina = window.devicePixelRatio > 1 ? true : false;
    if (retina) {
      const retinaEl = tpj("#logo img");
      const retinaLogoW = retinaEl.width();
      const retinaLogoH = retinaEl.height();
      
      retinaEl
        .attr("src", "assets/images/rome-logo-blanco.webp")
        .width(retinaLogoW)
        .height(retinaLogoH);
    }
  }
}
