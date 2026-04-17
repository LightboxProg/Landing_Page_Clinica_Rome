import { Component, AfterViewInit } from '@angular/core';

declare var jQuery: any;
declare var revslider_showDoubleJqueryError: any;

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.css'
})
export class InicioComponent implements AfterViewInit {

 
ngAfterViewInit(): void {
    // Le damos a Angular 150ms para que termine de renderizar el HTML
    // antes de que jQuery intente manipularlo.
    setTimeout(() => {
      const tpj = jQuery;
      let revapi1: any;

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
    }, 150); // <-- Aquí está la magia
  }
}
