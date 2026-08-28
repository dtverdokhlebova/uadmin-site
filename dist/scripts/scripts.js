const style = "";
document.addEventListener("DOMContentLoaded", () => {
  initHeader();
  initTariffsFeatures();
  initModals();
  initFeaturesSlider();
  initUiInputs();
  initContactForm();
});
const initHeader = () => {
  const siteHeader = document.querySelector(".header");
  if (!siteHeader) {
    return;
  }
  const headerClassNames = {
    floating: "header--floating",
    menuOpen: "header--menu-open",
    leaving: "header--leaving"
  };
  const headerElements = getHeaderElements(siteHeader, headerClassNames);
  initHeaderMenu(headerElements);
  initFloatingHeader(headerElements);
  updateHeaderScrollOffset(siteHeader);
};
const getHeaderElements = (siteHeader, classNames) => ({
  siteHeader,
  classNames,
  floatAfterElement: document.querySelector("[data-header-float-after]"),
  floatUntilElement: document.querySelector("[data-header-float-until]"),
  menuToggle: siteHeader.querySelector(".header__toggle"),
  mainNavigation: siteHeader.querySelector(".header__menu"),
  headerActionButtons: siteHeader.querySelectorAll(".header__actions .ui-button"),
  compactHeaderMedia: window.matchMedia("(max-width: 1619px)")
});
const updateHeaderScrollOffset = (siteHeader) => {
  const headerStyles = window.getComputedStyle(siteHeader);
  const headerTop = Number.parseFloat(
    headerStyles.getPropertyValue("--header-floating-top")
  ) || 0;
  const headerHeight = siteHeader.getBoundingClientRect().height;
  document.documentElement.style.setProperty(
    "--header-scroll-offset",
    `${headerTop + headerHeight}px`
  );
};
const updateHeaderActionButtons = ({
  siteHeader,
  headerActionButtons,
  classNames
}) => {
  const isPrimary = siteHeader.classList.contains(classNames.floating) || siteHeader.classList.contains(classNames.menuOpen);
  for (const button of headerActionButtons) {
    button.classList.toggle("ui-button--primary", isPrimary);
    button.classList.toggle("ui-button--outline-extra-light", !isPrimary);
  }
};
const setHeaderMenuState = (headerElements, isOpen) => {
  const {
    siteHeader,
    menuToggle,
    mainNavigation,
    compactHeaderMedia,
    classNames
  } = headerElements;
  const canOpen = compactHeaderMedia.matches;
  const shouldOpen = Boolean(isOpen && canOpen && menuToggle && mainNavigation);
  siteHeader.classList.toggle(classNames.menuOpen, shouldOpen);
  document.documentElement.classList.toggle("no-scroll", shouldOpen);
  menuToggle == null ? void 0 : menuToggle.setAttribute("aria-expanded", String(shouldOpen));
  mainNavigation == null ? void 0 : mainNavigation.setAttribute("aria-hidden", String(canOpen && !shouldOpen));
  updateHeaderActionButtons(headerElements);
};
const initHeaderMenu = (headerElements) => {
  var _a;
  const {
    siteHeader,
    menuToggle,
    mainNavigation,
    headerActionButtons,
    compactHeaderMedia,
    classNames
  } = headerElements;
  const closeMenu = () => setHeaderMenuState(headerElements, false);
  menuToggle == null ? void 0 : menuToggle.addEventListener("click", () => {
    const isOpen = siteHeader.classList.contains(classNames.menuOpen);
    setHeaderMenuState(headerElements, !isOpen);
  });
  mainNavigation == null ? void 0 : mainNavigation.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      closeMenu();
    }
  });
  for (const button of headerActionButtons) {
    button.addEventListener("click", closeMenu);
  }
  (_a = siteHeader.querySelector(".header__logo")) == null ? void 0 : _a.addEventListener("click", closeMenu);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && siteHeader.classList.contains(classNames.menuOpen)) {
      closeMenu();
      menuToggle == null ? void 0 : menuToggle.focus();
    }
  });
  compactHeaderMedia.addEventListener("change", closeMenu);
  closeMenu();
};
const updateFloatingHeader = (headerElements, floatingHeaderState) => {
  const {
    siteHeader,
    floatAfterElement,
    floatUntilElement,
    classNames
  } = headerElements;
  floatingHeaderState.scrollFrame = void 0;
  if (!floatAfterElement) {
    return;
  }
  const floatingStart = floatAfterElement.offsetTop + floatAfterElement.offsetHeight;
  const isPastFloatingStart = window.scrollY >= floatingStart - siteHeader.offsetHeight;
  const isPastFloatingEnd = floatUntilElement ? window.scrollY >= floatUntilElement.offsetTop - siteHeader.offsetHeight : false;
  const shouldFloat = isPastFloatingStart && !isPastFloatingEnd;
  const isFloating = siteHeader.classList.contains(classNames.floating);
  if (shouldFloat) {
    window.clearTimeout(floatingHeaderState.timeout);
    floatingHeaderState.timeout = void 0;
    siteHeader.classList.remove(classNames.leaving);
    if (!isFloating) {
      siteHeader.classList.add(classNames.floating);
      updateHeaderActionButtons(headerElements);
    }
    return;
  }
  if (isFloating && !siteHeader.classList.contains(classNames.leaving)) {
    siteHeader.classList.add(classNames.leaving);
    floatingHeaderState.timeout = window.setTimeout(() => {
      siteHeader.classList.remove(classNames.floating, classNames.leaving);
      updateHeaderActionButtons(headerElements);
      floatingHeaderState.timeout = void 0;
    }, 200);
  }
};
const requestFloatingHeaderUpdate = (headerElements, floatingHeaderState) => {
  if (floatingHeaderState.scrollFrame === void 0) {
    floatingHeaderState.scrollFrame = window.requestAnimationFrame(() => {
      updateFloatingHeader(headerElements, floatingHeaderState);
    });
  }
};
const initFloatingHeader = (headerElements) => {
  const floatingHeaderState = {
    scrollFrame: void 0,
    timeout: void 0
  };
  const requestUpdate = () => {
    requestFloatingHeaderUpdate(headerElements, floatingHeaderState);
  };
  const handleResize = () => {
    updateHeaderScrollOffset(headerElements.siteHeader);
    requestUpdate();
  };
  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", handleResize);
  updateFloatingHeader(headerElements, floatingHeaderState);
};
const initTariffsFeatures = () => {
  const tariffsFeatureItems = document.querySelectorAll(".tariffs-plan__feature[data-fill]");
  for (const item of tariffsFeatureItems) {
    const rawValue = Number(item.dataset.fill ?? 0);
    const fillValue = Math.max(0, Math.min(100, rawValue));
    item.style.setProperty("--tariffs-feature-fill", `${fillValue}%`);
  }
};
const updateModalScrollLock = (modalElements) => {
  const hasOpenModal = [...modalElements].some((modal) => !modal.hidden);
  document.documentElement.classList.toggle("no-scroll", hasOpenModal);
};
const getModalFocusableElements = (modal) => [
  ...modal.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )
].filter((element) => element.offsetParent !== null);
const keepFocusInsideModal = (event, modal) => {
  if (event.key !== "Tab") {
    return;
  }
  const focusableElements = getModalFocusableElements(modal);
  const firstElement = focusableElements[0];
  const lastElement = focusableElements.at(-1);
  if (event.shiftKey && document.activeElement === firstElement) {
    event.preventDefault();
    lastElement == null ? void 0 : lastElement.focus();
  } else if (!event.shiftKey && document.activeElement === lastElement) {
    event.preventDefault();
    firstElement == null ? void 0 : firstElement.focus();
  }
};
const createModalController = (modal, modalElements) => {
  const scrollContainer = modal.querySelector(".modal__scroll");
  const closingModalClassName = "is-closing";
  let closeTimeout;
  let openTrigger;
  const setModalHiddenState = (isHidden) => {
    modal.hidden = isHidden;
    modal.setAttribute("aria-hidden", String(isHidden));
  };
  const openModal = (trigger) => {
    if (!modal.hidden) {
      return;
    }
    openTrigger = trigger;
    window.clearTimeout(closeTimeout);
    modal.classList.remove(closingModalClassName);
    setModalHiddenState(false);
    scrollContainer == null ? void 0 : scrollContainer.scrollTo({ top: 0, left: 0 });
    updateModalScrollLock(modalElements);
    window.requestAnimationFrame(() => {
      modal.classList.add("is-visible");
      const firstFocusableElement = getModalFocusableElements(modal)[0];
      firstFocusableElement == null ? void 0 : firstFocusableElement.focus({ preventScroll: true });
    });
  };
  const closeModal = (immediate = false) => {
    if (modal.hidden || modal.classList.contains(closingModalClassName)) {
      return;
    }
    window.clearTimeout(closeTimeout);
    modal.classList.remove("is-visible");
    const finishClosing = () => {
      setModalHiddenState(true);
      modal.classList.remove(closingModalClassName);
      updateModalScrollLock(modalElements);
      if (!immediate) {
        openTrigger == null ? void 0 : openTrigger.focus({ preventScroll: true });
      }
      openTrigger = void 0;
    };
    if (immediate) {
      finishClosing();
    } else {
      modal.classList.add(closingModalClassName);
      closeTimeout = window.setTimeout(finishClosing, 200);
    }
  };
  for (const closeElement of modal.querySelectorAll(".js-modal-close")) {
    closeElement.addEventListener("click", () => {
      closeModal(closeElement.dataset.modalClose === "immediate");
    });
  }
  modal.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeModal();
      return;
    }
    keepFocusInsideModal(event, modal);
  });
  return { open: openModal };
};
const initModals = () => {
  const modalElements = document.querySelectorAll(".js-modal");
  const modalControllers = /* @__PURE__ */ new Map();
  for (const modal of modalElements) {
    if (modal.id) {
      modalControllers.set(modal.id, createModalController(modal, modalElements));
    }
  }
  for (const openElement of document.querySelectorAll(".js-modal-open")) {
    openElement.addEventListener("click", () => {
      var _a;
      (_a = modalControllers.get(openElement.dataset.modalOpen)) == null ? void 0 : _a.open(openElement);
    });
  }
};
const initFeaturesSlider = () => {
  const featuresSliderElement = document.querySelector(".features__slider");
  if (!featuresSliderElement || typeof Swiper === "undefined") {
    return;
  }
  const featuresSliderMedia = window.matchMedia("(max-width: 1029px)");
  let featuresSlider;
  const updateFeaturesSlider = () => {
    if (featuresSliderMedia.matches && !featuresSlider) {
      featuresSlider = new Swiper(featuresSliderElement, {
        slidesPerView: 1,
        spaceBetween: 20,
        speed: 500,
        autoHeight: true,
        grabCursor: true,
        watchOverflow: true,
        loop: true,
        navigation: {
          nextEl: ".ui-slider-button--next",
          prevEl: ".ui-slider-button--prev"
        },
        pagination: {
          el: ".ui-slider-pagination",
          clickable: true
        }
      });
      return;
    }
    if (!featuresSliderMedia.matches && featuresSlider) {
      featuresSlider.destroy(true, true);
      featuresSlider = void 0;
    }
  };
  updateFeaturesSlider();
  featuresSliderMedia.addEventListener("change", updateFeaturesSlider);
};
const updateUiInputFilledState = (inputContainer, control) => {
  inputContainer.classList.toggle("ui-input--filled", Boolean(control.value));
};
const initUiInputs = () => {
  const inputContainers = document.querySelectorAll(".ui-input");
  const forms = /* @__PURE__ */ new Set();
  for (const inputContainer of inputContainers) {
    const control = inputContainer.querySelector(".ui-input__control");
    if (!control) {
      continue;
    }
    const update = () => updateUiInputFilledState(inputContainer, control);
    control.addEventListener("input", update);
    control.addEventListener("change", update);
    update();
    if (control.form) {
      forms.add(control.form);
    }
  }
  for (const form of forms) {
    form.addEventListener("reset", () => {
      window.requestAnimationFrame(() => {
        for (const inputContainer of form.querySelectorAll(".ui-input")) {
          const control = inputContainer.querySelector(".ui-input__control");
          if (control) {
            updateUiInputFilledState(inputContainer, control);
          }
        }
      });
    });
  }
};
const initContactForm = () => {
  const contactForm = document.querySelector(".js-contact-form");
  if (!contactForm) {
    return;
  }
  const contactSuccessMessage = contactForm.querySelector(".js-contact-form-success");
  const contactSuccessButton = contactForm.querySelector(".js-contact-form-success-reset");
  const hasDemoSubmission = contactForm.classList.contains("js-contact-form-demo");
  const hasValidation = contactForm.classList.contains("js-contact-form-validation");
  const contactFormEvents = {
    success: "contact-form:success",
    reset: "contact-form:reset"
  };
  const showContactSuccess = () => {
    if (!contactForm || !contactSuccessMessage) {
      return;
    }
    contactForm.style.minHeight = `${contactForm.offsetHeight}px`;
    contactForm.reset();
    contactForm.classList.add("contact-form--success");
    contactSuccessMessage.hidden = false;
    window.requestAnimationFrame(() => contactSuccessMessage.focus());
  };
  const hideContactSuccess = () => {
    var _a;
    if (!contactForm || !contactSuccessMessage) {
      return;
    }
    contactForm.classList.remove("contact-form--success");
    contactForm.style.minHeight = "";
    contactSuccessMessage.hidden = true;
    (_a = contactForm.querySelector("input")) == null ? void 0 : _a.focus();
  };
  const dispatchContactFormEvent = (eventName) => {
    contactForm.dispatchEvent(new window.CustomEvent(eventName));
  };
  contactForm.addEventListener(contactFormEvents.success, showContactSuccess);
  contactForm.addEventListener(contactFormEvents.reset, hideContactSuccess);
  contactSuccessButton == null ? void 0 : contactSuccessButton.addEventListener("click", () => {
    dispatchContactFormEvent(contactFormEvents.reset);
  });
  if (hasValidation && window.JustValidate !== void 0) {
    const requiredFieldErrorMessage = "обязательное поле";
    const invalidFormatErrorMessage = "неверный формат";
    const personNamePattern = /^[A-Za-zА-Яа-яЁё]+(?:[ '-][A-Za-zА-Яа-яЁё]+)*$/u;
    const validatePersonName = (value) => {
      const normalizedValue = value.trim();
      return personNamePattern.test(normalizedValue);
    };
    const contactValidation = new window.JustValidate(contactForm, {
      errorFieldStyle: {},
      errorFieldCssClass: "ui-control--invalid",
      errorLabelStyle: {},
      errorLabelCssClass: "ui-error ui-error--float",
      focusInvalidField: true,
      lockForm: true,
      validateBeforeSubmitting: true,
      submitFormAutomatically: !hasDemoSubmission
    });
    contactValidation.addField(".js-contact-form-name", [
      {
        rule: "required",
        errorMessage: requiredFieldErrorMessage
      },
      {
        validator: validatePersonName,
        errorMessage: invalidFormatErrorMessage
      }
    ]).addField(".js-contact-form-last-name", [
      {
        rule: "required",
        errorMessage: requiredFieldErrorMessage
      },
      {
        validator: validatePersonName,
        errorMessage: invalidFormatErrorMessage
      }
    ]).addField(".js-contact-form-email", [
      {
        rule: "required",
        errorMessage: requiredFieldErrorMessage
      },
      {
        rule: "email",
        errorMessage: invalidFormatErrorMessage
      }
    ]).addField(".js-contact-form-phone", [
      {
        rule: "required",
        errorMessage: requiredFieldErrorMessage
      },
      {
        validator: (value) => {
          const normalizedValue = value.trim();
          const digits = value.replace(/\D/g, "");
          return /^[\d\s()+.-]+$/.test(normalizedValue) && digits.length >= 10 && digits.length <= 15;
        },
        errorMessage: "неправильный номер"
      }
    ]).addField(
      ".js-contact-form-policy",
      [
        {
          rule: "required",
          errorMessage: requiredFieldErrorMessage
        }
      ],
      {
        errorsContainer: ".js-contact-form-policy-errors",
        errorLabelCssClass: "ui-error ui-error--static"
      }
    ).onSuccess((event) => {
      if (!hasDemoSubmission) {
        return;
      }
      event.preventDefault();
      dispatchContactFormEvent(contactFormEvents.success);
      contactValidation.refresh();
    });
  }
};
